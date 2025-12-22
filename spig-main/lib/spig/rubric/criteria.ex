defmodule Spig.Rubric.Criteria do
  use Ecto.Schema
  import Ecto.Changeset

  schema "criteria" do
    field :name, :string
    field :description, :string
    field :points, :float
    belongs_to :rubric, Spig.Rubric
  end

  @doc false
  def changeset(criteria, attrs) do
    criteria
    |> cast(attrs, [:name, :description, :points])
    |> validate_required([:name, :points])
  end
end
