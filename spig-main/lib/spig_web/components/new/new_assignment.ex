defmodule SpigWeb.NewAssignment do
  alias Spig.Assignment
  alias Spig.Repo
  use SpigWeb, :live_component

  def render(assigns) do
    ~H"""
    <dialog id="createAssignment">
      <h1>New Assignment</h1>
      <.form for={@form} phx-submit="create" phx-change="validate" phx-target={@myself}>
        <label>Name: <.input phx-update="ignore" type="text" field={@form[:name]} autofocus /></label>
        Upload Instructions: <.live_file_input upload={@uploads.instructions} />
        <br />
        <%!-- handle upload errors --%>
        <%= for entry <- @uploads.instructions.entries do %>
          <%= for err <- upload_errors(@uploads.instructions, entry) do %>
            <p class="error"><%= error_to_string(err) %></p>
          <% end %>
        <% end %>
        <%= for err <- upload_errors(@uploads.instructions) do %>
          <p class="error"><%= error_to_string(err) %></p>
        <% end %>

        <button
          class="secondary"
          type="button"
          onclick="document.getElementById('createAssignment').close()"
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
      %Spig.Assignment{}
      |> Spig.Assignment.changeset(%{})
      |> to_form()

    {:ok,
     socket
     |> assign(:form, form)
     |> allow_upload(:instructions, accept: ~w(.pdf), max_entries: 1)}
  end

  def handle_event("create", %{"assignment" => assignment_params}, socket) do
    result =
      %Spig.Assignment{
        course_id: socket.assigns.course.id
      }
      |> Spig.Assignment.changeset(assignment_params)
      |> Spig.Repo.insert()

    case result do
      {:ok, assignment} ->
        {:noreply, success(save_entries(socket, assignment), assignment)}

      {:error, changeset} ->
        {:noreply, socket |> assign(:form, to_form(changeset))}
    end
  end

  def handle_event("validate", %{"assignment" => _}, socket) do
    # this is a minimal yet required callback
    {:noreply, socket}
  end

  defp save_entries(socket, assignment) do
    entries =
      consume_uploaded_entries(socket, :instructions, fn %{path: path}, _entry ->
        file_name = "instructions_#{assignment.id}.pdf"
        dest = Path.join([:code.priv_dir(:spig), "static", "uploads", file_name])
        File.cp!(path, dest)
        {:ok, ~p"/uploads/#{file_name}"}
      end)

    if length(entries) == 1 do
      [file | _] = entries
      # add an instruction url to the assignment and set has_pdf to true
      assignment |> Assignment.instructions_changeset(file) |> Repo.update!()
    end

    socket
  end

  defp success(socket, assignment) do
    # Broadcast the new assignment to the PubSub system
    Phoenix.PubSub.broadcast!(
      Spig.PubSub,
      "new_in_course:#{socket.assigns.course.id}",
      {:new_assignment, assignment}
    )

    # Trigger the closing of the dialog and navigation back to the course page
    push_event(socket, "assignment_created", %{})

    socket
    |> redirect(to: ~p"/course/#{socket.assigns.course.id}/assignment/#{assignment.id}")
  end

  defp error_to_string(:too_many_files), do: "You have selected too many files"
  defp error_to_string(:not_accepted), do: "Unsuitable file type. Expected a .pdf file"
  defp error_to_string(:too_large), do: "Your instructions file is too large!"
end
