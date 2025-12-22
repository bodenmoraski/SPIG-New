defmodule SpigWeb.Live.Assignment do
  alias Spig.Rubric
  use SpigWeb, :live_view
  alias Spig.{Assignment, Repo}

  import Ecto.Query

  def render(assigns) do
    ~H"""
    <dialog id="selectRubric">
      <div class="row">
        <h1>Select Rubric</h1>
        <div class="spacer"></div>
        <button class="secondary" onclick="this.parentElement.parentElement.close()">X</button>
      </div>
      <%= if @no_rubrics do %>
        <p>There are no rubrics available for this course, create one first!</p>
      <% end %>
      <a href={~p"/course/#{@assignment.course_id}/#addRubric?return_to=#{URI.encode_www_form(~p"/course/#{@assignment.course_id}/assignment/#{@assignment.id}")}"}><button>Create New Rubric</button></a>
      <%= unless @no_rubrics do %>
        <table>
          <thead>
            <th colspan="2">Rubric Name</th>
          </thead>
          <tbody id="rubricList" phx-update="stream">
            <tr :for={{dom_id, rubric} <- @streams.rubrics} id={dom_id}>
              <td><%= rubric.name %></td>
              <td>
                <button style="margin: 0" phx-click="select_rubric" phx-value-id={rubric.id}>
                  &rarr;
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      <% end %>
    </dialog>
    <dialog id="confirmDelete">
      <h1>Are you sure?</h1>
      <p>Deleting an assignment is an <em>irreversible</em> action!</p>
      <button class="secondary" onclick="this.parentElement.close()">Cancel</button>
      <button class="danger" phx-click="delete_assignment">Yes, delete!</button>
    </dialog>
    <dialog id="confirmDeletePDF">
      <h1>Are you sure?</h1>
      <p>Deleting the PDF is an <em>irreversible</em> action!</p>
      <button class="secondary" onclick="this.parentElement.close()">Cancel</button>
      <button class="danger" phx-click="delete_pdf">Yes, delete!</button>
    </dialog>
    <main>
      <div class="topbar" style="gap: 0.5rem">
        <h1>
          <a href={~p"/course/#{@assignment.course.id}"}><%= @assignment.course.name %></a>
          / <%= @assignment.name %>
        </h1>
        <div class="spacer"></div>
        <span>Rubric: <%= if @assignment.rubric, do: @assignment.rubric.name, else: "None" %></span>
        <button onclick="document.getElementById('selectRubric').showModal()">Select Rubric</button>

        <%= if @pdf_exists do %>
          <a
            href={"/uploads/instructions_#{@assignment.id}.pdf"}
            download={"instructions_#{@assignment.id}.pdf"}
          >
            <button class="secondary">Download PDF</button>
          </a>
          <button class="danger" onclick="document.getElementById('confirmDeletePDF').showModal()">
            Delete PDF
          </button>
        <% end %>

        <button class="danger" onclick="document.getElementById('confirmDelete').showModal()">
          Delete Assignment
        </button>
      </div>

      <section style="flex-grow: 1;">
        <%= if @pdf_exists do %>
          <iframe
            style="width: 100%; height: 80vh; margin-top: 0.5rem"
            src={"/uploads/instructions_#{@assignment.id}.pdf"}
          />
        <% else %>
        <div style="display: flex; flex-direction: column; justify-content: center; align-items: center">
          <h1 style="font-weight: normal; margin-top: 5rem; margin-bottom: 0.25rem">
            No PDF Uploaded
          </h1>
          <%= if @show_upload_form do %>
            <.form for={@uploads_form} phx-submit="save_pdf" phx-change="validate_upload">
              <.live_file_input upload={@uploads.instructions} />
              <br />
              <%= for entry <- @uploads.instructions.entries do %>
                <%= for err <- upload_errors(@uploads.instructions, entry) do %>
                  <p class="error"><%= error_to_string(err) %></p>
                <% end %>
              <% end %>
              <%= for err <- upload_errors(@uploads.instructions) do %>
                <p class="error"><%= error_to_string(err) %></p>
              <% end %>
              <button type="submit">Confirm Upload</button>
            </.form>
          <% else %>
            <button phx-click="show_upload_form">Upload PDF</button>
          <% end %>
        </div>
        <% end %>
      </section>
    </main>
    """
  end

  def mount(%{"assign_id" => assign_id}, _session, socket) do
    assignment =
      Repo.get!(Assignment, assign_id)
      |> Repo.preload([:rubric, :course])

    pdf_exists = Assignment.pdf_exists?(assignment)

    all_rubrics =
      from(r in Rubric, where: r.course_id == ^assignment.course_id)
      |> Repo.all()

    no_rubrics = length(all_rubrics) == 0

    {:ok,
     socket
     |> assign(:assignment, assignment)
     |> assign(:pdf_exists, pdf_exists)
     |> assign(:no_rubrics, no_rubrics)
     |> allow_upload(:instructions, accept: ~w(.pdf), max_entries: 1)
     |> assign(:uploads_form, to_form(%{}))
     |> assign(:show_upload_form, false)
     |> stream(:rubrics, all_rubrics)}
  end

  def handle_event("show_upload_form", _params, socket) do
    {:noreply, assign(socket, :show_upload_form, true)}
  end

  def handle_event("save_pdf", _params, socket) do
    case consume_uploaded_entries(socket, :instructions, fn %{path: path}, _entry ->
      file_name = "instructions_#{socket.assigns.assignment.id}.pdf"
      dest = Path.join([:code.priv_dir(:spig), "static", "uploads", file_name])
      File.cp!(path, dest)
      {:ok, ~p"/uploads/#{file_name}"}
    end) do
      [] ->
        {:noreply, assign(socket, :error_message, "No file uploaded.")}

      [_file | _] ->
        {:ok, _assignment} =
          socket.assigns.assignment
          |> Assignment.changeset(%{pdf_exists: true})
          |> Repo.update()

        {:noreply,
          socket
          |> assign(:pdf_exists, true)
          |> assign(:show_upload_form, false)
          |> put_flash(:info, "PDF uploaded successfully.")}
    end
  end

  def handle_event("validate_upload", _params, socket) do
    # This is a minimal yet required callback for handling validations
    {:noreply, socket}
  end

  def handle_event("download_pdf", _params, socket) do
    pdf_url = "/uploads/instructions_#{socket.assigns.assignment.id}.pdf"
    {:noreply, push_redirect(socket, to: pdf_url)}
  end

  def handle_event("delete_assignment", _params, socket) do
    assignment = socket.assigns.assignment

    case Repo.delete(assignment) do
      {:ok, _deleted_assignment} ->
        {:noreply, push_redirect(socket, to: "/course/#{assignment.course_id}")}

      {:error, _changeset} ->
        {:noreply, assign(socket, error_message: "Failed to delete assignment.")}
    end
  end

  def handle_event("delete_pdf", _params, socket) do
    assignment = socket.assigns.assignment
    pdf_path = Path.join([:code.priv_dir(:spig), "static", "uploads", "instructions_#{assignment.id}.pdf"])

    case File.rm(pdf_path) do
      :ok ->
        updated_assignment =
          assignment
          |> Assignment.changeset(%{pdf_exists: false})
          |> Repo.update!()

        {:noreply,
          socket
          |> assign(:assignment, updated_assignment)
          |> assign(:pdf_exists, false)}

      {:error, reason} ->
        {:noreply, assign(socket, error_message: "Failed to delete PDF: #{reason}.")}
    end
  end

  def handle_event("select_rubric", %{"id" => rid}, socket) do
    {rid, ""} = Integer.parse(rid)

    assignment =
      socket.assigns.assignment
      |> Assignment.rubric_changeset(rid)
      |> Repo.update!()
      |> Repo.preload([:rubric], force: true)

    {:noreply, socket |> assign(:assignment, assignment)}
  end

  defp error_to_string(:too_many_files), do: "You have selected too many files"
  defp error_to_string(:not_accepted), do: "Unsuitable file type. Expected a .pdf file"
  defp error_to_string(:too_large), do: "Your instructions file is too large!"
end
