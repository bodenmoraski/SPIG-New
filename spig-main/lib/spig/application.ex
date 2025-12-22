defmodule Spig.Application do
  # See https://hexdocs.pm/elixir/Application.html
  # for more information on OTP Applications
  @moduledoc false
  alias Spig.GoogleToken.JwksStrategy

  use Application

  @impl true
  def start(_type, _args) do
    children = [
      SpigWeb.Telemetry,
      Spig.Repo,
      {DNSCluster, query: Application.get_env(:spig, :dns_cluster_query) || :ignore},
      {Phoenix.PubSub, name: Spig.PubSub},
      # Start the Finch HTTP client for sending emails
      {Finch, name: Spig.Finch},
      JwksStrategy,
      # Start a worker by calling: Spig.Worker.start_link(arg)
      # {Spig.Worker, arg},
      # Start to serve requests, typically the last entry
      SpigWeb.Endpoint
    ]

    # See https://hexdocs.pm/elixir/Supervisor.html
    # for other strategies and supported options
    opts = [strategy: :one_for_one, name: Spig.Supervisor]
    Supervisor.start_link(children, opts)
  end

  # Tell Phoenix to update the endpoint configuration
  # whenever the application is updated.
  @impl true
  def config_change(changed, _new, removed) do
    SpigWeb.Endpoint.config_change(changed, removed)
    :ok
  end
end
