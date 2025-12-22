defmodule SpigWeb.Authorization do
  import Plug.Conn
  import Phoenix.Controller
  import Ecto.Query

  @moduledoc """
    Generic plugs and functions for authorization of users
  """
  alias Spig.Course
  alias Spig.Repo

  def role(conn) do
    (conn.assigns.current_user || %{:role => "guest"}).role
  end

  def is_admin(conn) do
    role(conn) == "admin"
  end

  def has_access_to_course(conn, id) do
    uid = conn.assigns.current_user.id

    course =
      Course
      |> where([c], c.teacher_id == ^uid and c.id == ^id)
      |> select([c], c.id)
      |> Repo.one()

    course != nil
  end

  def course_route(conn, _opts) do
    id = conn.params["id"]

    if(is_admin(conn) or has_access_to_course(conn, id)) do
      # allow access
      conn
    else
      conn
      |> put_flash(:error, "You do not have access to that course!")
      |> redirect(to: "/")
      |> halt()
    end
  end

  def teacher_only(conn, _opts) do
    if conn.assigns.current_user.role not in ["teacher", "admin"] do
      conn
      |> put_flash(:error, "Only teachers may access that page!")
      |> redirect(to: "/")
      |> halt()
    else
      conn
    end
  end
end
