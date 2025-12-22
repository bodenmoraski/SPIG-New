defmodule SpigWeb.Live.Sections do
  use SpigWeb, :live_view
  alias Spig.Repo

  def render(assigns) do
    ~H"""
    <main>
      <h1>Your Courses</h1>
        <%= if Enum.count(@streams.sections) == 0 do %>
          <p>You are not currently enrolled in any courses.</p>
        <% else %>
        <div class="items" id="sections" phx-update="stream">
          <%= for {dom_id, section} <- @streams.sections do %>
            <a
              class="item"
              id={dom_id}
              href={~p"/section/#{section.id}"}
            >
              <h2><%= section.course.name %></h2>
              <span><%= section.name %></span>
            </a>
          <% end %>
        </div>
        <% end %>
    </main>
    """
  end

  def mount(_params, _session, socket) do
    user = socket.assigns.current_user

    sections =
      Spig.Repo.all(Ecto.assoc(user, :sections))
      |> Repo.preload(:course)

    {:ok,
     socket
     |> assign(:page_title, "Your Courses")
     |> stream(:sections, sections)}
  end

  def handle_info({:join_section, section}, socket) do
    {:noreply, stream(socket, :sections, [section])}
  end

  def handle_info({:leave_section, section}, socket) do
    {:noreply, stream_delete(socket, :sections, section)}
  end
end
