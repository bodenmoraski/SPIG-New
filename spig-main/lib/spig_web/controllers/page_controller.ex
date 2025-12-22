defmodule SpigWeb.PageController do
  use SpigWeb, :controller

  def home(conn, _params) do
    render(conn, :home)
  end
end
