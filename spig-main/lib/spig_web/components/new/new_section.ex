defmodule SpigWeb.NewSection do
  use SpigWeb, :live_component

  def render(assigns) do
    ~H"""
    <dialog id="createSection">
      <div class="row">
        <h1>New Section</h1>
      </div>
      <.form for={@form} phx-submit="create" phx-target={@myself}>
        <label>Name: <.input type="text" field={@form[:name]} autofocus /></label>
        <label>Semester: <.input type="text" field={@form[:semester]} autofocus /></label>
        <label>Year: <.input type="text" field={@form[:year]} autofocus /></label>
        <button
          class="secondary"
          type="button"
          onclick="document.getElementById('createSection').close()"
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
      %Spig.Section{}
      |> Spig.Section.changeset(%{})
      |> to_form()

    {:ok, socket |> assign(:form, form)}
  end

  def handle_event("create", %{"section" => section_params}, socket) do
    result =
      %Spig.Section{
        course_id: socket.assigns.course.id,
        joinable_code: Spig.Section.gen_code(),
        teacher_id: socket.assigns.current_user.id
      }
      |> Spig.Section.changeset(section_params)
      |> Spig.Repo.insert()

    case result do
      {:ok, section} ->
        {:noreply, success(socket, section)}

      {:error, changeset} ->
        {:noreply, socket |> assign(:form, to_form(changeset))}
    end
  end

  def success(socket, section) do
    Phoenix.PubSub.broadcast!(
      Spig.PubSub,
      "new_in_course:#{socket.assigns.course.id}",
      {:new_section, section}
    )

    socket
    |> redirect(to: ~p"/course/#{socket.assigns.course.id}/section/#{section.id}")
  end
end
