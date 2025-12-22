defmodule SpigWeb.NewRubric do
  use SpigWeb, :live_component

  def render(assigns) do
    ~H"""
    <dialog id="createRubric">
      <div class="row">
        <h1>Add a Rubric</h1>
      </div>
      <.form for={@form} phx-submit="create" phx-target={@myself}>
        <label>Name: <.input type="text" field={@form[:name]} autofocus /></label>
        <button
          class="secondary"
          type="button"
          onclick="document.getElementById('createRubric').close()"
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
      %Spig.Rubric{}
      |> Spig.Rubric.changeset(%{})
      |> to_form()

    {:ok, socket |> assign(:form, form)}
  end

  def handle_event("create", %{"rubric" => rubric_params}, socket) do
    result =
      %Spig.Rubric{
        course_id: socket.assigns.course.id
      }
      |> Spig.Rubric.changeset(rubric_params)
      |> Spig.Repo.insert()

    case result do
      {:ok, rubric} ->
        {:noreply, success(socket, rubric)}

      {:error, changeset} ->
        {:noreply, socket |> assign(:form, to_form(changeset))}
    end
  end

  def success(socket, rubric) do
    return_url = socket.assigns[:return_url]

    Phoenix.PubSub.broadcast!(
      Spig.PubSub,
      "new_in_course:#{socket.assigns.course.id}",
      {:new_rubric, rubric}
    )

    if return_url do
      socket
      |> redirect(to: return_url)
    else
      socket
      |> redirect(to: ~p"/course/#{socket.assigns.course.id}/rubric/#{rubric.id}")
    end
  end
end
