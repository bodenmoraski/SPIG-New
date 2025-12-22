defmodule Spig.Course do
  use Ecto.Schema
  import Ecto.Changeset

  schema "courses" do
    field :name, :string
    belongs_to :teacher, Spig.Accounts.User
    has_many :sections, Spig.Section
    has_many :rubrics, Spig.Rubric
    has_many :assignments, Spig.Assignment

    timestamps(type: :utc_datetime)
  end

  @doc false
  def changeset(course, attrs) do
    course
    |> cast(attrs, [:name])
    |> validate_length(:name, min: 2, max: 100)
    |> validate_required([:name, :teacher_id])
  end
end
