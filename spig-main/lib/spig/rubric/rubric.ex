defmodule Spig.Rubric do
  use Ecto.Schema
  import Ecto.Changeset

  schema "rubrics" do
    field :name, :string
    has_many :criteria, Spig.Rubric.Criteria
    belongs_to :course, Spig.Course

    timestamps(type: :utc_datetime)
  end

  @doc false
  def changeset(rubric, attrs) do
    rubric
    |> cast(attrs, [:name])
    |> validate_required([:name, :course_id])
  end

  def tally_rubric(criteria, evaluation) do
    pointTotal = Enum.reduce(criteria, 0, fn (c, acc) ->
      eval = evaluation["#{c.id}"];
      on = if eval == nil, do: false, else: eval
      if on, do: acc + c.points, else: acc
    end)

    pointTotal
  end
end
