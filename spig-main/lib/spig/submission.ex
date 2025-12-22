defmodule Spig.Submission do
  use Ecto.Schema
  import Ecto.Changeset

  schema "submissions" do
    field :value, :string
    belongs_to :student, Spig.Accounts.User
    belongs_to :assignment, Spig.Assignment

    timestamps(type: :utc_datetime)
  end

  @doc false
  def changeset(submission, attrs) do
    submission
    |> cast(attrs, [:value])
    |> validate_required([:value, :student_id, :assignment_id])
  end
end
