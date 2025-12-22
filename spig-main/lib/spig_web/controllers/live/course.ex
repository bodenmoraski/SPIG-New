defmodule SpigWeb.Live.Course do
  alias Spig.{Course, Repo}
  use SpigWeb, :live_view

  def render(assigns) do
    ~H"""
    <script>
      document.addEventListener("DOMContentLoaded", () => {
        if(location.hash == "#addRubric") {
          document.getElementById("createRubric").showModal()
        }
      })
    </script>
    <.live_component
      module={SpigWeb.NewSection}
      id="newSection"
      current_user={@current_user}
      course={@course}
    />
    <.live_component
      module={SpigWeb.NewRubric}
      id="newRubric"
      current_user={@current_user}
      course={@course}
    />
    <.live_component
      module={SpigWeb.NewAssignment}
      id="newAssignment"}
      current_user={@current_user}
      course={@course}
    />
    <main>
      <div class="topbar">
        <h1><%= @course.name %></h1>
        <span class="headingstat">Teacher: <%= @course.teacher.name %></span>
        <div class="spacer"></div>
        <a href={~p"/course/#{@course.id}/settings"}><button>Settings</button></a>
      </div>
      <h2>Sections</h2>
      <div class="items" id="sections" phx-update="stream">
        <a
          onclick="document.getElementById('createSection').showModal()"
          id="csb"
          phx-update="ignore"
          href="#"
        >
          <div class="item new section"></div>
        </a>
        <a
          :for={{dom_id, section} <- @streams.sections}
          class="item"
          id={dom_id}
          href={~p"/course/#{@course.id}/section/#{section.id}"}
        >
          <div>
            <h2><%= section.name %></h2>
          </div>
        </a>
      </div>
      <h2>Assignments</h2>
      <div id="assignments" class="items" phx-update="stream">
        <a
          onclick="document.getElementById('createAssignment').showModal()"
          id="cab"
          phx-update="ignore"
          href="#"
        >
          <div class="item new assignment"></div>
        </a>
        <a
          :for={{dom_id, assignment} <- @streams.assignments}
          class="item"
          id={dom_id}
          href={~p"/course/#{@course.id}/assignment/#{assignment.id}"}
          phx-update="stream"
        >
          <div>
            <h2><%= assignment.name %></h2>
          </div>
        </a>
      </div>
      <h2>Rubrics</h2>
      <div class="items">
        <a
          onclick="document.getElementById('createRubric').showModal()"
          href="#"
          id="rsb"
          phx-update="ignore"
        >
          <div class="item new rubric"></div>
        </a>
        <a
          :for={{dom_id, rubric} <- @streams.rubrics}
          class="item"
          id={dom_id}
          href={~p"/course/#{@course.id}/rubric/#{rubric.id}"}
          phx-update="stream"
        >
          <div>
            <h2><%= rubric.name %></h2>
          </div>
        </a>
      </div>
    </main>
    """
  end

  @spec mount(map(), any(), map()) :: {:ok, any()}
  def mount(%{"return_to" => return_to} = params, session, socket) do
    socket = mount_common(params, session, socket)

    if params["hash"] == "addRubric" do
      {:ok, assign(socket, :return_url, URI.decode_www_form(return_to))}
    else
      {:ok, socket}
    end
  end

  def mount(params, session, socket) do
    {:ok, mount_common(params, session, socket)}
  end

  defp mount_common(params, session, socket) do
    course =
      Repo.get!(Course, params["id"])
      |> Repo.preload([:teacher, :sections, :rubrics, :assignments])

    Phoenix.PubSub.subscribe(Spig.PubSub, "new_in_course:#{params["id"]}")

    socket
    |> assign(:course, course)
    |> assign(:page_title, course.name)
    |> stream(:sections, course.sections)
    |> stream(:assignments, course.assignments)
    |> stream(:rubrics, course.rubrics)
  end

  def handle_info({:new_section, s}, socket) do
    {:noreply, socket |> stream_insert(:sections, s)}
  end

  def handle_info({:new_assignment, a}, socket) do
    {:noreply, socket |> stream_insert(:assignments, a)}
  end

  def handle_info({:new_rubric, r}, socket) do
    {:noreply, socket |> stream_insert(:rubrics, r)}
  end
end
