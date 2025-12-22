defmodule SpigWeb.Live.Join do
  alias Spig.{Repo, Section}
  import Ecto.Query
  use SpigWeb, :live_view

  def render(assigns) do
    ~H"""
    <main style="margin-top: 2rem; text-align: center">
      <%= if @section.link_active do %>
        <h1><%= @section.course.name %></h1>
        <p><%= @section.teacher.name %> | <%= @section.name %></p>
        <button phx-click="joinClass">
          <div style="display: flex; align-items: center">
            <img height="15px" style="margin-right: 0.5rem" src={@current_user.avatar} />
            Join as <%= @current_user.name %>
          </div>
        </button>
      <% else %>
        <h1>NOPE</h1>
        <p>This link isn't active!</p>
      <% end %>
    </main>
    """
  end

  def mount(params, _session, socket) do
    membership = Repo.one(
         from m in "section_memberships",
           join: sec in Section,
           on: sec.joinable_code == ^params["code"],
           where: m.section_id == sec.id and m.user_id == ^socket.assigns.current_user.id,
           select: m.id
       )
    if membership do
      {:ok, socket |> push_navigate(to: ~p"/section/#{membership}")}
    else
      sec =
        Repo.one!(
          from s in Section,
            where: s.joinable_code == ^params["code"],
            select: s,
            preload: [:teacher, :course]
        )

      Phoenix.PubSub.subscribe(Spig.PubSub, "section_link:#{sec.joinable_code}")

      {:ok, assign(socket, :section, sec)}
    end
  end

  def handle_event("joinClass", _params, socket) do
    data = [
      %{
        "user_id" => socket.assigns.current_user.id,
        "section_id" => socket.assigns.section.id
      }
    ]

    Repo.insert_all("section_memberships", data)

    Phoenix.PubSub.broadcast!(
      Spig.PubSub,
      "section_m:#{socket.assigns.section.id}",
      {:join, socket.assigns.current_user}
    )

    {:noreply,
     socket
     |> redirect(to: ~p"/section/#{socket.assigns.section.id}")}
  end

  def handle_info({:toggled_activation, is_active}, socket) do
    sec =
      socket.assigns.section
      |> Map.put(:link_active, is_active)

    {:noreply, socket |> assign(:section, sec)}
  end
end
