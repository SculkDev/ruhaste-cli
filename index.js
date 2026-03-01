#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { request } from "node:https";
import { request as httpRequest } from "node:http";
import { URL } from "node:url";
import { env, argv, stdin, stdout, stderr, exit } from "node:process";

const DEFAULT_URL = "https://hastebin.ru";
const BASE_URL = (env.RUHASTE_SERVER ?? DEFAULT_URL).replace(/\/$/, "");

function fetch(method, path, body) {
  return new Promise((resolve, reject) => {
    const url = new URL(BASE_URL + path);
    const lib = url.protocol === "https:" ? request : httpRequest;
    const options = {
      hostname: url.hostname,
      port: url.port || (url.protocol === "https:" ? 443 : 80),
      path: url.pathname + url.search,
      method,
      headers: {
        "Accept": "application/json",
        ...(body != null
          ? { "Content-Type": "text/plain", "Content-Length": Buffer.byteLength(body) }
          : {}),
      },
    };

    const req = lib(options, (res) => {
      const chunks = [];
      res.on("data", (c) => chunks.push(c));
      res.on("end", () => resolve({ status: res.statusCode, body: Buffer.concat(chunks).toString() }));
    });

    req.on("error", reject);
    if (body != null) req.write(body);
    req.end();
  });
}

async function apiPost(content) {
  const res = await fetch("POST", "/documents", content);
  const json = parseJSON(res.body);
  if (res.status !== 200) die(json?.message ?? `Server error ${res.status}`);
  return json;
}

async function apiGet(key) {
  const res = await fetch("GET", `/documents/${key}`);
  const json = parseJSON(res.body);
  if (res.status === 404) die(`Document not found: ${key}`);
  if (res.status !== 200) die(json?.message ?? `Server error ${res.status}`);
  return json;
}

async function apiRaw(key) {
  const res = await fetch("GET", `/raw/${key}`);
  if (res.status === 404) die(`Document not found: ${key}`);
  if (res.status !== 200) die(`Server error ${res.status}`);
  return res.body;
}

function parseJSON(str) {
  try { return JSON.parse(str); } catch { return null; }
}

function die(msg) {
  stderr.write(`error: ${msg}\n`);
  exit(1);
}

function readStdin() {
  return new Promise((resolve, reject) => {
    const chunks = [];
    stdin.on("data", (c) => chunks.push(c));
    stdin.on("end", () => resolve(Buffer.concat(chunks).toString()));
    stdin.on("error", reject);
  });
}

async function cmdPost(args) {
  let content;
  if (args.length > 0) {
    const file = args[0];
    try { content = readFileSync(file, "utf8"); }
    catch (e) { die(`Cannot read file "${file}": ${e.message}`); }
  } else {
    if (stdin.isTTY) {
      stderr.write("Reading from stdin (Ctrl+D to finish)…\n");
    }
    content = await readStdin();
  }

  if (!content) die("Nothing to post.");

  const { key } = await apiPost(content);
  stdout.write(`${BASE_URL}/${key}\n`);
}

async function cmdGet(args) {
  if (!args.length) die("Usage: ruhaste get <key|url>");
  const key = resolveKey(args[0]);
  const { data } = await apiGet(key);
  stdout.write(data);
  if (!data.endsWith("\n")) stdout.write("\n");
}

async function cmdRaw(args) {
  if (!args.length) die("Usage: ruhaste raw <key|url>");
  const key = resolveKey(args[0]);
  const text = await apiRaw(key);
  stdout.write(text);
  if (!text.endsWith("\n")) stdout.write("\n");
}

function resolveKey(input) {
  try {
    const u = new URL(input);
    const parts = u.pathname.split("/").filter(Boolean);
    if (parts.length) return parts[parts.length - 1];
  } catch { /* not a URL */ }
  return input;
}

function help() {
  stdout.write(`ruhaste — CLI client for a Hastebin-compatible pastebin

Usage:
  ruhaste [file]             Post a file (or stdin) and print the URL
  ruhaste post [file]        Same as above
  ruhaste get  <key|url>     Fetch a paste and print its content

Environment:
  RUHASTE_SERVER             Base URL of the server (default: ${DEFAULT_URL})

Examples:
  echo "hello world" | ruhaste
  ruhaste ./notes.txt
  ruhaste <(echo "hello")
  ruhaste get abc123
  ruhaste raw https://hastebin.ru/abc123
`);
}

const [, , cmd, ...rest] = argv;

switch (cmd) {
  case "post": await cmdPost(rest); break;
  case "get":  await cmdGet(rest);  break;
  case "raw":  await cmdRaw(rest);  break;
  case "help":
  case "--help":
  case "-h":
    help();
    break;
  case undefined:
    await cmdPost([]);
    break;
  default:
    await cmdPost([cmd, ...rest]);
}
