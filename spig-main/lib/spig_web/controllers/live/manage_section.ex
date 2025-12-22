defmodule SpigWeb.Live.ManageSection do
  alias Spig.Report
  alias Spig.Group
  alias Spig.Accounts.User
  alias Spig.Submission
  alias Spig.{Section, Repo, Assignment}
  import Ecto.Query
  use SpigWeb, :live_view

  def render(assigns) do
    ~H"""
    <script type="module" src={~p"/assets/confetti.js"}>
    </script>
    <dialog id="deleteSubmissions">
      <h1>Are you sure?</h1>
      <p>This will <em>irreversibly</em> delete all submissions for the selected assignment.</p>
      <form method="dialog">
        <button class="secondary">Cancel</button>
        <button phx-click="deleteSubmissions" class="danger">Yes, delete</button>
      </form>
    </dialog>
    <dialog id="generateReport">
      <div class="row">
        <h1>Generate report</h1>
        <div class="spacer"></div>
        <button class="secondary" onclick="document.getElementById('generateReport').close()">X</button>
      </div>
      <p>The assignment has concluded. If you're done grading submissions, you can generate a report.</p>
      <form method="dialog">
        <a target="_blank" href={~p"/section/#{@section.id}"}><button type="button" class="secondary">Grade More Submissions</button></a>
        <button phx-click="generateReport">Generate</button>
      </form>
    </dialog>
    <dialog id="invitemodal" class={if @joining, do: "rainbow", else: "boring"}>
      <div class="row">
        <h1>Invite Students</h1>
        <div class="spacer"></div>
        <button class="secondary" onclick="document.getElementById('invitemodal').close()">X</button>
      </div>
      <label>
        Invite Link:
        <input
          type="text"
          readonly
          style="width: 100%"
          onfocus="this.setSelectionRange(0, this.value.length)"
          value={"#{@base_url}/section/join/#{@section.joinable_code}"}
        />
      </label>
      <button phx-click="toggleActivation">
        <%= if @section.link_active, do: "Deactivate Link", else: "Activate Link" %>
      </button>
      <button class="secondary" phx-click="regenerateLink">
        Regenerate Link
      </button>
      <h3>Students</h3>
      <div id="students" class="items" phx-update="stream">
        <%= for {dom_id, student} <- @streams.students do %>
          <div class="item mini" id={dom_id}>
            <img style="height: 20px; margin-right: 0.25rem" src={student.avatar} />
            <%= student.name %>
          </div>
        <% end %>
      </div>
    </dialog>
    <main>
      <div class="topbar">
        <h1>
          <a href={~p"/course/#{@section.course.id}"}><%= @section.course.name %></a>
          / <%= @section.name %>
        </h1>
        <span class="headingstat">Teacher: <%= @section.teacher.name %></span>
        <div class="spacer"></div>
        <a target="blank" href={~p"/section/#{@section.id}?student_view=1"}><button class="secondary">Open Student View &rarr;</button></a>
        <a style="margin-left: 0.5rem" target="blank" href={~p"/section/#{@section.id}"}>
          <button>Grade Submissions &rarr;</button>
        </a>
      </div>
      <div>
        <h2>Invite Link</h2>
        <p>Invitations are <b><%= if @section.link_active, do: "OPEN", else: "CLOSED" %></b></p>
        <button onclick="document.getElementById('invitemodal').showModal()">Invite Students</button>
      </div>
      <div>
        <h2>Assignment</h2>
        <%= if @section.assignment == nil do %>
          <%= if Enum.empty?(@assignments) do %>
            <p>No assignments are available.</p>
          <% else %>
            <form phx-submit="setAssignment" style="display: flex; align-items: center">
              <select required name="assignment">
                <option value="" disabled selected>Select an assignment</option>
                <%= for assignment <- @assignments do %>
                  <option value={assignment.id}><%= assignment.name %></option>
                <% end %>
              </select>
              <button type="submit">Start Assignment &rarr;</button>
            </form>
          <% end %>
        <% else %>
          <p>Assignment: <b><%= @section.assignment.name %></b></p>
          <p>Submissions: <%= Enum.count(@submissions) %> / <%= @student_count %></p>
          <button
            class="danger"
            disabled={Enum.count(@submissions) == 0}
            onclick="document.getElementById('deleteSubmissions').showModal()"
          >
            Delete All Submissions
          </button>
          <p>This section is <b><%= @section.status %></b>.</p>
          <button disabled={@prevStatus == nil} class="secondary" phx-click="prevActivity">
            &larr;Back to <%= @prevStatus || Enum.at(Section.statuses(), 0) %>
          </button>
          <%= if @section.status == "viewing results" do %>
            <button onclick="document.getElementById('generateReport').showModal()">Generate Report</button>
          <% end %>
          <%= if @nextStatus != nil do %>
            <button phx-click="nextActivity" onclick={
              if @nextStatus == "viewing results" do
                "document.getElementById('generateReport').showModal()"
              else
                ""
              end
            }>Start <%= @nextStatus %>&rarr;</button>
          <% else %>
            <button class="danger" phx-click="endActivity">End Activity</button>
          <% end %>
        <% end %>
      </div>
      <%= if @section.status == "viewing results" and @report do %>
        <div>
          <h2>Class Results</h2>
          <div class="results-grid">
            <div class="result-card">
              <h3>Class Statistics</h3>
              <div class="stats">
                <div>Class Average: <%= @report.report["class"]["total_average"] %></div>
                <div>Highest: <%= @report.report["class"]["highest"] %></div>
                <div>Lowest: <%= @report.report["class"]["lowest"] %></div>
                <div>Median: <%= @report.report["class"]["median"] %></div>
              </div>
            </div>
            <%= for {student_id, results} <- @report.report do %>
              <%= if student_id != "class" do %>
                <% student = Enum.find(@section.students, & "#{&1.id}" == student_id) %>
                <%= if student do %>
                  <div class="result-card">
                    <h3><%= student.name %></h3>
                    <div class="stats">
                      <div>Total Average: <%= results["total_average"] %></div>
                      <div>Weighted Average: <%= results["weighted_average"] %></div>
                      <%= if results["outlier"] do %>
                        <div class="warning">⚠️ Potential outlier</div>
                      <% end %>
                    </div>
                  </div>
                <% end %>
              <% end %>
            <% end %>
          </div>
        </div>
      <% end %>
    </main>
    """
  end

  def mount(%{"sec_id" => sec_id, "id" => course_id}, _session, socket) do
    res =
      Repo.one(
        from s in Section,
          where: s.id == ^sec_id and s.course_id == ^course_id,
          preload: [:course, :teacher, :students, :assignment],
          select: s
      )

    Phoenix.PubSub.subscribe(
      Spig.PubSub,
      "section_m:#{sec_id}"
    )

    case res do
      %Section{} = section ->
        assignments =
          from a in Assignment,
            where: a.course_id == ^section.course_id,
            select: a

        assignments = Repo.all(assignments)

        socket =
          socket
          |> assign(:base_url, Application.get_env(:spig, SpigWeb.Endpoint)[:base_url])
          |> assign(:joining, false)
          |> assign(:section, section)
          |> assign(:page_title, section.name)
          |> assign(:prevStatus, Section.back_status(section.status))
          |> assign(:nextStatus, Section.next_status(section.status))
          |> assign(:assignments, assignments)
          |> assign(:student_count, Enum.count(section.students))
          |> fetch_submissions()
          |> fetch_results()
          |> stream(:students, section.students)

        {:ok, socket}

      _ ->
        {:error, :not_found}
    end
  end

  defp fetch_submissions(socket) do
    section = socket.assigns.section

    submissions =
      if section.assignment_id == nil,
        do: [],
        else:
          Repo.all(
            from(s in Submission,
              where: s.assignment_id == ^section.assignment_id,
              select: [s.student_id]
            )
          )

    socket |> assign(:submissions, submissions)
  end

  defp fetch_results(socket) do
    report = if socket.assigns.section.assignment_id do
      Repo.one(
        from r in Spig.Report,
          where: r.section_id == ^socket.assigns.section.id
            and r.assignment_id == ^socket.assigns.section.assignment_id,
          order_by: [desc: r.inserted_at],
          limit: 1
      )
    else
      nil
    end

    socket |> assign(:report, report)
  end

  def handle_info({:join, student}, socket) do
    {:noreply,
     socket
     |> stream(:students, [student])
     |> assign(:student_count, socket.assigns.student_count + 1)
     |> assign(:joining, true)}
  end

  def handle_info({:submission, s}, socket) do
    {:noreply, socket |> assign(:submissions, [s | socket.assigns.submissions])}
  end

  def handle_event("generateReport", _params, socket) do
    IO.puts("Generating report...")

    Report.generate_report(
      socket.assigns.section.assignment.id,
      socket.assigns.section.id,
      socket.assigns.section.assignment.rubric_id
    )

    Phoenix.PubSub.broadcast!(
      Spig.PubSub,
      "section:#{socket.assigns.section.id}",
      {:report_generated}
    )

    {:noreply, socket |> fetch_results()}
  end

  def handle_event("regenerateLink", _params, socket) do
    Phoenix.PubSub.broadcast!(
      Spig.PubSub,
      "section_link:#{socket.assigns.section.joinable_code}",
      {:toggled_activation, false}
    )

    {:noreply,
     assign(
       socket,
       :section,
       Ecto.Changeset.change(socket.assigns.section, joinable_code: Spig.Section.gen_code())
       |> Repo.update!()
     )}
  end

  def handle_event("toggleActivation", _params, socket) do
    is_active = not socket.assigns.section.link_active

    Phoenix.PubSub.broadcast!(
      Spig.PubSub,
      "section_link:#{socket.assigns.section.joinable_code}",
      {:toggled_activation, is_active}
    )

    {:noreply,
     socket
     |> assign(
       :section,
       Ecto.Changeset.change(socket.assigns.section,
         link_active: is_active
       )
       |> Repo.update!()
     )}
  end

  def handle_event("nextActivity", _params, socket) do
    socket = if socket.assigns.nextStatus == "grading in groups" do
      # generate random groups!
      socket |> generate_groups()
    else
      socket
    end
    {:noreply, socket |> set_status(socket.assigns.nextStatus)}
  end

  def handle_event("prevActivity", _params, socket) do
    {:noreply, socket |> set_status(socket.assigns.prevStatus)}
  end

  def handle_event("endActivity", _params, socket) do
    section =
      socket.assigns.section
      |> Section.assignment_changeset(nil)
      |> Repo.update!()
      |> Repo.preload([:assignment], force: true)

    section_updated(section)

    {:noreply,
     socket
     |> assign(:section, section)}
  end

  def handle_event("deleteSubmissions", %{}, socket) do
    from(s in Submission, where: s.assignment_id == ^socket.assigns.section.assignment_id)
    |> Repo.delete_all()

    section_updated(socket.assigns.section)

    {:noreply, socket |> fetch_submissions()}
  end

  def handle_event("setAssignment", %{"assignment" => assignment}, socket) do
    if assignment == "" do
      {:noreply, socket |> put_flash(:error, "Please select an assignment.")}
    else
      {id, ""} = Integer.parse(assignment)

      # verify that these are from the same course
      qu =
        from a in Assignment,
          where: a.course_id == ^socket.assigns.section.course_id

      if !Repo.exists?(qu) do
        {:noreply, socket}
      else
        section =
          socket.assigns.section
          |> Section.assignment_changeset(id)
          |> Repo.update!()
          |> Repo.preload([:assignment], force: true)

        ns = Enum.at(Section.statuses(), 0)

        {:noreply,
         socket
         |> assign(:section, section)
         |> set_status(ns)
         |> fetch_submissions()}
      end
    end
  end

  defp generate_groups(socket) do
    students = from(u in User,
      inner_join: s in "section_memberships",
      on: s.section_id == ^socket.assigns.section.id and u.id == s.user_id,
      select: u.id
    ) |> Repo.all()

    per_group = 5 # todo: this is intentionally low for development. make this configurable!
    students = Enum.shuffle(students)
    ngroups = ceil(length(students) / per_group)
    groups = Enum.map(1..ngroups, fn(_) ->
      %Group{
        section_id: socket.assigns.section.id
      } |> Repo.insert!()
    end)
    Enum.chunk_every(students, per_group)
    |> Enum.zip(groups)
    |> Enum.each(fn({students, group}) ->
      Enum.each(students, fn(stu) ->
        from(m in "section_memberships",
          where: m.user_id == ^stu and m.section_id == ^socket.assigns.section.id,
          update: [set: [group_id: ^group.id]])
          |> Repo.update_all([])
      end)
    end)
    socket
  end

  defp section_updated(section) do
    Phoenix.PubSub.broadcast!(
      Spig.PubSub,
      "section:#{section.id}",
      {:section_updated, section}
    )
  end

  defp set_status(socket, ns) do
    nns = Spig.Section.next_status(ns)
    pps = Spig.Section.back_status(ns)

    updated =
      Spig.Section.status_changeset(socket.assigns.section, ns)
      |> Repo.update!()

    section_updated(updated)

    socket
    |> assign(
      :section,
      Spig.Section.status_changeset(socket.assigns.section, ns)
      |> Repo.update!()
    )
    |> assign(
      :nextStatus,
      nns
    )
    |> assign(
      :prevStatus,
      pps
    )
  end
end
