# ruhaste

CLI client for [hastebin.ru](https://hastebin.ru) — a Hastebin-compatible pastebin.

## Install

```sh
npm install -g @sculkdev/ruhaste
```

Requires Node.js ≥ 18. No external dependencies.

## Usage

### Post a paste

```sh
# from stdin
echo "hello world" | ruhaste
cat file.txt | ruhaste

# from a file
ruhaste ./notes.txt

# bash process substitution
ruhaste <(echo "hello")
```

Prints the URL of the created paste, e.g. `https://hastebin.ru/abc123`.

### Fetch a paste

```sh
ruhaste get abc123
ruhaste get https://hastebin.ru/abc123
```

### Help

```sh
ruhaste help
```

## Configuration

| Variable | Default | Description |
|---|---|---|
| `RUHASTE_SERVER` | `https://hastebin.ru` | Base URL of the server |

Point at a self-hosted instance:

```sh
export RUHASTE_SERVER=http://localhost:7331
echo "test" | ruhaste
```

## Composing with other tools

```sh
# share the output of a command
npm test 2>&1 | ruhaste

# fetch a paste into a variable
content=$(ruhaste get abc123)

# open a paste in the browser (macOS/Linux)
ruhaste ./file.txt | xargs open
```
s