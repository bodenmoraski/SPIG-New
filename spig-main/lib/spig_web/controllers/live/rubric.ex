defmodule SpigWeb.Live.Rubric do
  alias Spig.Rubric.Criteria
  alias Spig.Rubric
  alias Spig.Repo
  use SpigWeb, :live_view
  import Ecto.Query

  def render(assigns) do
    ~H"""
    <dialog id="confirmDelete">
      <h1>Are you sure?</h1>
      <p>Deleting a rubric is an <em>irreversible</em> action!</p>
      <button class="secondary" onclick="this.parentElement.close()">Cancel</button>
      <button class="danger" phx-click="delete_rubric">Yes, delete!</button>
    </dialog>
    <dialog id="createCriterion">
      <h1>Create Criterion</h1>
      <.form for={@new_criterion_form} phx-change="validate_criterion" phx-submit="add_criterion">
        <label>Name: <.input type="text" field={@new_criterion_form[:name]} autofocus /></label>
        <label>Description: <.input type="textarea" field={@new_criterion_form[:description]} /></label>
        <label>Points: <.input value="0" step="0.5" type="number" field={@new_criterion_form[:points]} /></label>
        <button type="button" onclick="this.parentElement.parentElement.close()" class="secondary">Cancel</button>
        <button type="submit">Add to Rubric</button>
      </.form>
    </dialog>
    <main>
      <div class="topbar">
        <h1>
          <a href={~p"/course/#{@rubric.course.id}"}><%= @rubric.course.name %></a>
          / <%= @rubric.name %>
        </h1>
        <div class="spacer"></div>
        <button class="danger" onclick="document.getElementById('confirmDelete').showModal()">Delete</button>
      </div>
      <div style="display: flex; flex-direction: row; align-items: center">
        <h2 style="margin-right: 0.5rem">Criteria</h2>
        <button onclick="document.getElementById('createCriterion').showModal()">+</button>
      </div>
      <table>
        <thead>
          <th>Name</th>
          <th>Description</th>
          <th>Point Value</th>
          <th>...</th>
        </thead>
        <tbody id="criteria" phx-update="stream">
          <tr :for={{id, criteria} <- @streams.criteria} id={id}>
            <td><%= criteria.name %></td>
            <td><%= criteria.description %></td>
            <td><%= criteria.points %></td>
            <td style="text-align: center">
              <button
                class="danger"
                style="margin: 0"
                phx-click="delete_criteria"
                phx-value-id={criteria.id}
                phx-value-dom-id={id}
              >x</button>
            </td>
          </tr>
        </tbody>
      </table>
    </main>
    """
  end

  def mount(%{"rub_id" => rub_id, "id" => course_id}, _session, socket) do
    rubric =
      Repo.one(
        from s in Rubric,
          where: s.id == ^rub_id and s.course_id == ^course_id,
          preload: [:course, :criteria],
          select: s
      )

    new_criterion = %Criteria{
      rubric_id: rubric.id
    }
      |> Criteria.changeset(%{})
      |> to_form()

    socket =
      socket
      |> assign(:page_title, rubric.name)
      |> assign(:new_criterion_form, new_criterion)
      |> stream(:criteria, rubric.criteria)

    # don't save loaded criteria in server memory!
    rubric = Ecto.reset_fields(rubric, [:criteria])

    socket = socket
      |> assign(:rubric, rubric)

    {:ok, socket}
  end

  def handle_event("validate_criterion", %{"criteria" => criterion_params}, socket) do
    new_criterion = %Criteria{
      rubric_id: socket.assigns.rubric.id
    }
      |> Criteria.changeset(criterion_params)
      |> to_form()
    {:noreply,
      socket
      |> assign(:new_criterion_form, new_criterion)
    }
  end

  def handle_event("add_criterion", %{"criteria" => criterion_params}, socket) do
    new_criterion = %Criteria{
      rubric_id: socket.assigns.rubric.id
    }
      |> Criteria.changeset(criterion_params)

    cr = new_criterion |> Repo.insert!()
    {:noreply, socket
      |> assign(:new_criterion_form, %Criteria{} |> Criteria.changeset(%{:points => criterion_params["points"]}) |> to_form())
      |> stream(:criteria, [cr])
    }
  end

  def handle_event("delete_rubric", _, socket) do
    socket.assigns.rubric |> Repo.delete!()
    {:noreply, socket |> push_navigate(to: ~p"/course/#{socket.assigns.rubric.course_id}")}
  end

  def handle_event("delete_criteria", %{"id" => id, "dom-id" => dom_id}, socket) do
    {id, ""} = Integer.parse(id)
    from(c in Criteria, where: c.id == ^id) |> Repo.delete_all()
    {:noreply, socket |> stream_delete_by_dom_id(:criteria, dom_id)}
  end
end
