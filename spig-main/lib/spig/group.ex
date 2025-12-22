defmodule Spig.Group do
  alias Spig.Section
  alias Spig.Accounts
  use Ecto.Schema
  import Ecto.Changeset

  schema "groups" do
    many_to_many :students, Accounts.User, join_through: "section_memberships"
    belongs_to :section, Section

    timestamps(type: :utc_datetime)
  end

  @doc false
  def changeset(group, attrs) do
    group
    |> cast(attrs, [])
    |> validate_required([])
  end
end
