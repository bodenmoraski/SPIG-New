# Spig
## Development Guide
 1) [Install Elixir](https://elixir-lang.org/install.html)
 2) Install dependencies:
```sh
mix deps.get
```
 3) Run the server:
```sh
mix phx.server
```

## File Structure
Most of the important files are located in the `lib` folder.

### `lib`
Inside `lib`, you will find the `spig` and `spig_web` folders, which may seem confusing.

`spig_web` contains code that deals with HTTP routing and is also where the frontend code is stored.

`spig` on the other hand contains code that is generally business logic, and can be decoupled from the frontend if necessary.

### `priv`
The only important folders here are `priv/static/styles` and `priv/repo`. The former contains the styles (e.g. css) for the whole site and the latter contains database migrations.