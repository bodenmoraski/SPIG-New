defmodule SpigWeb.Username do
  use Phoenix.Component

  attr :current_user, Spig.Accounts.User, required: true

  def username(assigns) do
    ~H"""
    <span
      style={"color: #{
        case @current_user.role do
          "admin" -> "#ff5555"
          "student" -> "#ffffff"
          "teacher" -> "#52dd22"
        end
        }"}
      class="username"
    >
      <span><%= @current_user.name %></span>
    </span>
    """
  end
end
