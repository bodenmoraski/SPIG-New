defmodule SpigWeb.Live.CourseSettings do
  alias Spig.{Course, Repo}
  use SpigWeb, :live_view

  def render(assigns) do
    ~H"""
    <dialog id="confirmDelete">
      <h1>Are you sure?</h1>
      <p>
        Deleting a course is an <em>irreversible</em> action!
        If the semester is over, consider adding a new section instead.
      </p>
      <button onclick="this.parentElement.close()" class="secondary">Cancel</button>
      <button class="danger" phx-click="delete_course">Yes, delete this course</button>
    </dialog>
    <main>
      <div class="topbar">
        <h1>Settings for <%= @course.name %></h1>
        <div class="spacer"></div>
        <a href={~p"/course/#{@course.id}"}><button>Back to Course</button></a>
      </div>
      <h2>Course Settings</h2>
      <div>
        <form phx-change="update_course_name" phx-submit="save_course_name">
          <label for="course_name">Course Name:</label>
          <input type="text" id="course_name" name="course_name" value={@course.name} /><br />
          <button type="submit">Save</button>
        </form>
      </div>
      <%!-- <h2>Teacher Settings:</h2>
      <!-- teacher settings to be added --> --%>
      <h2>Danger Zone</h2>
      <div>
        <button class="danger" onclick="document.getElementById('confirmDelete').showModal()">Delete Course</button>
      </div>
    </main>
    """
  end

  @spec mount(map(), any(), map()) :: {:ok, any()}
  def mount(%{"id" => id}, _session, socket) do
    course =
      Repo.get!(Course, id)
      |> Repo.preload(:teacher)

    {:ok,
     socket
     |> assign(:course, course)
     |> assign(:page_title, "Settings for #{course.name}")}
  end

  def handle_event("update_course_name", %{"course_name" => name}, socket) do
    {:noreply, assign(socket, :course_name, name)}
  end

  def handle_event("save_course_name", _params, socket) do
    course = socket.assigns.course
    name = socket.assigns.course_name

    changeset = Course.changeset(course, %{name: name})
    case Repo.update(changeset) do
      {:ok, course} ->
        {:noreply, assign(socket, :course, course)}

      {:error, changeset} ->
        {:noreply, assign(socket, :changeset, changeset)}
    end
  end

  def handle_event("delete_course", _params, socket) do
    course = socket.assigns.course

    case Repo.delete(course) do
      {:ok, _course} ->
        {:noreply, push_redirect(socket, to: "/home")}

      {:error, _changeset} ->
        {:noreply, socket}
    end
  end
end
