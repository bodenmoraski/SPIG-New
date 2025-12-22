defmodule SpigWeb.CorporateController do
  use SpigWeb, :controller

  def home(conn, _params) do
    render(conn, :home)
  end

  # Add this function
  def contact(conn, _params) do
    render(conn, :contact)
  end
end
