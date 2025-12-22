defmodule Spig.Report do
  alias Spig.Section
  alias Spig.Rubric
  alias Spig.Score
  alias Spig.Submission
  alias Spig.Repo
  use Ecto.Schema
  import Ecto.Query
  import Ecto.Changeset

  schema "reports" do

    field :assignment_id, :id
    field :section_id, :id
    field :rubric_id, :id
    field :report_version, :integer
    field :report, :map

    timestamps(type: :utc_datetime)
  end

  @doc false
  def changeset(report, attrs) do
    report
    |> cast(attrs, [])
    |> validate_required([:report, :report_version, :assignment_id, :section_id, :rubric_id])
  end

  def generate_report(assignment_id, section_id, rubric_id) do
    # fetch all data
    section = Repo.get!(Section, section_id)

    students = Repo.all(
      from m in "section_memberships",
      where: m.section_id == ^section_id,
      select: m.user_id
    ) |> Enum.sort()

    rubric = Repo.get!(Rubric, rubric_id)
      |> Repo.preload([:criteria])

    grades = Enum.map(students, fn(stu) ->
      scores = Repo.all(
        from s in Score,
        join: su in Submission,
        on: su.id == s.submission_id,
        where: su.student_id == ^stu
          and not is_nil(s.scorer_id)
          and s.scorer_id != ^section.teacher_id # we're only looking for student -> student scores
          and su.assignment_id == ^assignment_id
      ) |> Enum.sort_by(fn(score) -> score.scorer_id end) # sort by scorer id

      points = Enum.map(scores, fn(score) ->
        Rubric.tally_rubric(rubric.criteria, score.evaluation)
      end)

      points
    end)

    group_grades = Enum.map(students, fn(stu) ->
      scores = Repo.all(
        from s in Score,
        join: su in Submission,
        on: su.id == s.submission_id,
        where: su.student_id == ^stu and not is_nil(s.group_id) and su.assignment_id == ^assignment_id
      ) |> Enum.sort_by(fn(score) -> score.group_id end) # sort by group_id

      points = Enum.map(scores, fn(score) ->
        Rubric.tally_rubric(rubric.criteria, score.evaluation)
      end)

      points
    end)

    teacher_grades = Enum.map(students, fn(stu) ->
        teacher_score = Repo.one(
          from s in Score,
          join: su in Submission,
          on: su.id == s.submission_id,
          where: su.student_id == ^stu and s.scorer_id == ^section.teacher_id and su.assignment_id == ^assignment_id
        )

        if teacher_score == nil do
          # todo: is this really a good placeholder?
          0
        else
          pointTotal = Enum.reduce(rubric.criteria, 0, fn (c, acc) ->
            eval = teacher_score.evaluation["#{c.id}"];
            on = if eval == nil, do: false, else: eval
            if on, do: acc + c.points, else: acc
          end)

          pointTotal
        end
    end)

    # I hate erlang ports with a *burning* passion
    # - lawson 1:30am
    port = Port.open({:spawn_executable, "python_data/.venv/bin/python3"},
      [
        :binary,
        args: ["python_data/process.py"],
      ])

    input = %{
      students: Enum.map(students, fn(stu) -> to_string(stu) end),
      grades: grades,
      teacher_grades: teacher_grades,
      group_grades: group_grades
    }

    Port.command(port, Jason.encode!(input) <> "\n")

    receive do
      {^port, {:data, data}} ->
        data = Jason.decode!(String.trim(data))
        Repo.insert!(%Spig.Report{
          assignment_id: assignment_id,
          section_id: section_id,
          rubric_id: rubric_id,
          report: Map.delete(data, "version"),
          report_version: data["version"]
        })
      after 5000 ->
        # timeout
        try do
          Port.close(port)
        rescue
          _ ->
            IO.puts("timeout, process exited")
        end
    end
  end
end
