defmodule Spig.Repo do
  use Ecto.Repo,
    otp_app: :spig,
    adapter: Ecto.Adapters.Postgres
end
