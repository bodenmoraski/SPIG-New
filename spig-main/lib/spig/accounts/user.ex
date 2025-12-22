defmodule Spig.Accounts.User do
  use Ecto.Schema
  import Ecto.Changeset

  schema "users" do
    field :email, :string
    field :role, :string
    field :avatar, :string
    field :name, :string
    many_to_many :sections, Spig.Section, join_through: "section_memberships"
    has_many :courses, Spig.Course, foreign_key: :teacher_id

    timestamps(type: :utc_datetime)
  end

  @doc """
  A user changeset for registration.
  """
  def registration_changeset(user, attrs) do
    user
    |> cast(attrs, [:email, :role, :avatar, :name])
    |> validate_required([:email, :role, :name])
  end
end
