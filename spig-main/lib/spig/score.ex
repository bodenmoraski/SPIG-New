defmodule Spig.Score do
  alias Spig.{Accounts.User, Submission, Rubric, Assignment, Group}
  use Ecto.Schema
  import Ecto.Changeset

  schema "scores" do
    field :evaluation, :map
    field :signed, :map
    field :done, :boolean

    belongs_to :assignment, Assignment
    belongs_to :submission, Submission
    belongs_to :scorer, User
    belongs_to :group, Group
    belongs_to :rubric, Rubric

    timestamps(type: :utc_datetime)
  end

  @doc false
  def changeset(score, attrs) do
    score
    |> cast(attrs, [:evaluation])
    |> validate_required([:evaluation])
  end

  def sign_eval(score, user_id) do
    updated = Map.put(score.signed, user_id, true)
    score
    |> cast(%{:signed => updated}, [:signed])
  end

  def update_eval(score, eval) do
    score
    |> cast(%{:evaluation => eval, :signed => %{}}, [:evaluation, :signed])
  end

  def done(score) do
    score
    |> cast(%{:done => true}, [:done])
  end
end
