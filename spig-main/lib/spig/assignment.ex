defmodule Spig.Assignment do
  use Ecto.Schema
  import Ecto.Changeset

  schema "assignments" do
    field :name, :string
    field :instructions, :string

    belongs_to :rubric, Spig.Rubric
    belongs_to :course, Spig.Course
    timestamps()
  end

  def changeset(assignment, attrs) do
    assignment
    |> cast(attrs, [:name, :course_id])
    |> validate_required([:name, :course_id])
  end

  def instructions_changeset(assignment, instructions_url) do
    assignment
    |> cast(%{instructions: instructions_url}, [:instructions])
  end

  def rubric_changeset(assignment, rubric_id) do
    assignment
    |> cast(%{rubric_id: rubric_id}, [:rubric_id])
  end

  def pdf_exists?(assignment) do
    file_path = Path.join([:code.priv_dir(:spig), "static", "uploads", "instructions_#{assignment.id}.pdf"])
    File.exists?(file_path)
  end
end
