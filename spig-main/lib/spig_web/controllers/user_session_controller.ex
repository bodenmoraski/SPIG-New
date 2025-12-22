defmodule SpigWeb.UserSessionController do
  use SpigWeb, :controller

  alias Spig.Accounts
  alias SpigWeb.UserAuth

  def create(conn, %{"credential" => cred}) do
    {:ok, claims} = Spig.GoogleToken.verify_and_validate(cred)
    user = Accounts.get_user_by_email(claims["email"])

    # if !Spig.Accounts.is_trusted_email(claims["hd"]) do
    #   # personal email
    #   conn
    #   |> put_status(401)
    #   |> assign(:invalid_email, claims["email"])
    #   |> put_view(SpigWeb.PageHTML)
    #   |> render(:bad_email)
    # else
      user =
        if user == nil do
          {:ok, u} =
            Accounts.register_user(%{
              :email => claims["email"],
              :role => "student",
              :name => claims["name"],
              :avatar => claims["picture"]
            })

          u
        else
          user
        end

      conn
      |> UserAuth.log_in_user(user)
    # end
  end

  def delete(conn, _params) do
    conn
    |> put_flash(:info, "Logged out successfully.")
    |> UserAuth.log_out_user()
  end
end
