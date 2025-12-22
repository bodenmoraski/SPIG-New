defmodule SpigWeb.Live.StudentView do
  alias Spig.Group
  alias Spig.Score
  use SpigWeb, :live_view
  import Ecto.Query
  alias Spig.{Repo, Section, Submission}

  def mount(%{"id" => id} = params, _, socket) do
    # TODO: handle error
    {id, ""} = Integer.parse(id)

    section =
      Repo.get!(Section, id)
      |> Repo.preload(assignment: [rubric: :criteria])

    is_teacher = if params["student_view"] == "1" do
      IO.puts("grading mode")
      false # always a student!
    else
      section.teacher_id == socket.assigns.current_user.id
    end

    section = if is_teacher, do: %{section | status: "grading individually"}, else: section

    if not is_teacher do
      # we only subscribe to changes if we're not in teacher mode
      # if there's a state change in teacher mode, we don't want to react to it.
      Phoenix.PubSub.subscribe(Spig.PubSub, "section:#{section.id}")
    end

    {:ok,
     socket
     |> assign(:section, section)
     |> assign(:is_teacher, is_teacher)
     |> assign(:reviewing, nil)
     |> update_all()}
  end

  def handle_event("submit", code, socket) do
    submission =
      Submission.changeset(
        %Submission{
          assignment_id: socket.assigns.section.assignment.id,
          student_id: socket.assigns.current_user.id
        },
        %{:value => code}
      )
      |> Repo.insert!()

    Phoenix.PubSub.broadcast!(
      Spig.PubSub,
      "section_m:#{socket.assigns.section.id}",
      {:submission, submission}
    )

    {:noreply,
     socket
     |> update_submitted()}
  end

  def handle_event("submitEvaluation", evaluation, socket) do
    %Score{
      evaluation: evaluation,
      assignment_id: socket.assigns.section.assignment.id,
      rubric_id: socket.assigns.section.assignment.rubric.id,
      scorer_id: socket.assigns.current_user.id,
      submission_id: socket.assigns.reviewing.id,
      done: true
    } |> Repo.insert!()

    {
      :noreply,
      socket |> fetch_reviews()
    }
  end

  def handle_event("updateEval", evaluation, socket) do
    {:noreply, socket |> update_eval(evaluation)}
  end

  def handle_event("agreement", _eval, socket) do
    # sign
    agreed_score = socket.assigns.score
      |> Score.sign_eval("#{socket.assigns.current_user.id}")
      |> Repo.update!()

    agreed_score = if all_in?(socket, agreed_score) do
      # submit score!
      agreed_score
        |> Score.done()
        |> Repo.update!()
    else
      agreed_score
    end

    score_changed(socket, agreed_score)

    {:noreply, socket}
  end

  defp update_eval(socket, eval) do
    score = socket.assigns.score
      |> Score.update_eval(eval)
      |> Repo.update!()

    score_changed(socket, score)

    socket
  end

  defp score_changed(socket, score) do
    Phoenix.PubSub.broadcast!(
      Spig.PubSub,
      "section:#{socket.assigns.section.id}",
      {socket.assigns.group.id, :score_update, score}
    )
  end

  def update_submitted(socket) do
    submitted =
      if socket.assigns.section.assignment != nil do
        submission =
          from s in "submissions",
            where:
              s.student_id == ^socket.assigns.current_user.id and
                s.assignment_id == ^socket.assigns.section.assignment.id

        submission |> Repo.exists?()
      else
        false
      end

    socket |> assign(:submitted, submitted)
  end

  def check_if_pdf_exists(socket) do
    pdf_exists =
      if socket.assigns.section.assignment != nil,
        do: Spig.Assignment.pdf_exists?(socket.assigns.section.assignment),
        else: false

    socket |> assign(:pdf_exists, pdf_exists)
  end

  defp update_results(socket) do
    res = if socket.assigns.section.assignment &&
            socket.assigns.section.assignment.rubric_id do
      report = Repo.one(
        from r in Spig.Report,
          where:
            r.rubric_id == ^socket.assigns.section.assignment.rubric_id
            and r.section_id == ^socket.assigns.section.id
            and r.assignment_id == ^socket.assigns.section.assignment.id,
        order_by: [desc: r.id],
        limit: 1
      )

      if report do
        # Debug line
        IO.inspect(report.report["#{socket.assigns.current_user.id}"], label: "Report for user")
        report.report["#{socket.assigns.current_user.id}"]
      end
    end

    socket |> assign(:results, res)
  end

  defp fetch_group(socket) do
    group = Enum.at(from(
      g in Group,
      inner_join: membership in "section_memberships",
      on: membership.user_id == ^socket.assigns.current_user.id
        and membership.section_id == ^socket.assigns.section.id,
      where: g.id == membership.group_id,
      preload: [:students]
    )
    |> Repo.all(), 0)

    group_members = if group == nil do
      nil
    else
      n_students = length(group.students)
      Enum.filter(group.students, fn(stu) -> stu.id != socket.assigns.current_user.id end)
        |> Enum.with_index() |> Enum.reduce("", fn({student, i}, acc) ->
          cond do
            i == 0 -> acc
            i == n_students - 1 -> acc <> ", and "
            true -> acc <> ", "
          end <> student.name
      end)
    end

    group_members = if group_members == "", do: "only yourself", else: group_members

    socket |> assign(:group, group) |> assign(:groupMembers, group_members)
  end

  defp fetch_reviews(socket) do
    # is the status now grading?
    review =
      if socket.assigns.section.assignment_id != nil &&
           String.contains?(socket.assigns.section.status, "grading") do
        # fetch the next necessary review
        q = case socket.assigns.section.status do
        "grading individually" -> from(s in Submission,
            left_join: sc in Score, on: sc.submission_id == s.id and sc.scorer_id == ^socket.assigns.current_user.id and sc.done,
            where: is_nil(sc.id) and s.assignment_id == ^socket.assigns.section.assignment_id,
            limit: 1
          )
        "grading in groups" -> from(s in Submission,
            left_join: sc in Score, on: sc.submission_id == s.id and sc.group_id == ^socket.assigns.group.id and sc.done,
            where: is_nil(sc.id) and s.assignment_id == ^socket.assigns.section.assignment_id,
            limit: 1
          )
        end
        q |> Repo.one()
      else
        nil
      end

    socket = if review != nil do
      socket |> push_event("hydrateGradingForm", %{})
    else
      socket
    end

    socket = if review != nil && review != socket.assigns.reviewing do
      socket |> push_event("setEditorCode", %{code: review.value})
    else
      socket
    end

    socket |> assign(:reviewing, review)
  end

  defp fetch_score(socket) do
    score = if socket.assigns.section.status == "grading in groups" and socket.assigns.reviewing != nil do
      %Score{
        group_id: socket.assigns.group.id,
        assignment_id: socket.assigns.section.assignment_id,
        rubric_id: socket.assigns.section.assignment.rubric_id,
        submission_id: socket.assigns.reviewing.id
      } |> Repo.insert!(on_conflict: :nothing)
      from(s in Score,
        where: s.group_id == ^socket.assigns.group.id
          and s.assignment_id == ^socket.assigns.section.assignment_id
          and s.submission_id == ^socket.assigns.reviewing.id,
        select: s) |> Repo.one!()
    else
      nil
    end

    socket |> set_score(score)
  end

  defp set_score(socket, score) do
    if score do
      socket |> assign(:score, score) |> push_event("scoreUpdate", %{
        evaluation: score.evaluation,
        signed: score.signed,
        progress: Enum.count(score.signed, fn {_k, v} -> v end) / Enum.count(socket.assigns.group.students)
      })
    else
      socket
    end
  end

  defp update_all(socket) do
    socket
    |> update_submitted()
    |> check_if_pdf_exists()
    |> fetch_group()
    |> fetch_reviews()
    |> fetch_score()
    |> update_results()
  end

  def all_in?(socket, score) do
    Enum.all?(socket.assigns.group.students, fn(stu) ->
      score.signed["#{stu.id}"]
    end)
  end

  def handle_info({:section_updated, section}, socket) do
    sec =
      %Section{
        %{socket.assigns.section | status: section.status}
        | assignment_id: section.assignment_id
      }
      |> Ecto.reset_fields([:assignment])
      |> Repo.preload([assignment: [rubric: :criteria]], force: true)

    {:noreply,
     socket
     |> assign(:section, sec)
     |> update_all()}
  end

  def handle_info({:report_generated}, socket) do
    {:noreply, socket |> update_results()}
  end

  def handle_info({group_id, :score_update, new_score}, socket) do
    socket = if socket.assigns.group && socket.assigns.group.id == group_id do
      if all_in?(socket, new_score) do
        socket |> fetch_reviews() |> fetch_score()
      else
        socket |> set_score(new_score)
      end
    else
      socket
    end

    {:noreply, socket}
  end
end
