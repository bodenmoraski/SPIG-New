defmodule SpigWeb.Live.Courses do
  use SpigWeb, :live_view

  def render(assigns) do
    ~H"""
    <.live_component module={SpigWeb.NewCourse} id="create_course" current_user={@current_user} />
    <main>
      <h1>Courses</h1>
      <div class="items" id="courses" phx-update="stream">
        <a href="#" onclick="document.getElementById('createCourse').showModal()">
          <div class="item new course"></div>
        </a>
        <.link :for={{dom_id, course} <- @streams.courses} href={~p"/course/#{course.id}"} id={dom_id}>
          <div class="item">
            <h2><%= course.name %></h2>
          </div>
        </.link>
      </div>
    </main>
    """
  end

  def mount(_params, _session, socket) do
    user = socket.assigns.current_user

    courses =
      Spig.Repo.all(Ecto.assoc(user, :courses))

    {:ok,
     socket
     |> assign(:page_title, "Courses")
     |> stream(:courses, courses)}
  end
end
