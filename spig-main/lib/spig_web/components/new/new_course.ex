defmodule SpigWeb.NewCourse do
  use SpigWeb, :live_component

  def render(assigns) do
    ~H"""
    <dialog id="createCourse">
      <div class="row">
        <h1>Add a Course</h1>
      </div>
      <.form for={@form} phx-submit="create" phx-target={@myself}>
        <label>Name: <.input type="text" field={@form[:name]} autofocus /></label>
        <button
          class="secondary"
          type="button"
          onclick="document.getElementById('createCourse').close()"
        >
          Cancel
        </button>
        <button>Create</button>
      </.form>
    </dialog>
    """
  end

  def mount(socket) do
    form =
      %Spig.Course{}
      |> Spig.Course.changeset(%{})
      |> to_form()

    {:ok, socket |> assign(:form, form)}
  end

  def handle_event("create", %{"course" => course_params}, socket) do
    result =
      %Spig.Course{teacher_id: socket.assigns.current_user.id}
      |> Spig.Course.changeset(course_params)
      |> Spig.Repo.insert()

    case result do
      {:ok, course} ->
        {:noreply,
         socket
         |> redirect(to: ~p"/course/#{course.id}")}

      {:error, changeset} ->
        {:noreply, socket |> assign(:form, to_form(changeset))}
    end
  end
end
