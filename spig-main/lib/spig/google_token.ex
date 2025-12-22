defmodule Spig.GoogleToken do
  defmodule JwksStrategy do
    use JokenJwks.DefaultStrategyTemplate

    def init_opts(opts) do
      url = "https://www.googleapis.com/oauth2/v3/certs"
      Keyword.merge(opts, jwks_url: url)
    end
  end

  use Joken.Config, default_signer: nil

  add_hook(JokenJwks,
    strategy: Spig.GoogleToken.JwksStrategy
  )

  @impl true
  def token_config() do
    default_claims(skip: [:aud, :iss])
    |> add_claim("iss", nil, &(&1 in ["accounts.google.com", "https://accounts.google.com"]))
    |> add_claim("aud", nil, &(&1 =~ Application.get_env(:spig, Spig.GoogleToken)[:client_id]))
  end
end
