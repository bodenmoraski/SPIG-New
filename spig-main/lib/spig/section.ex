defmodule Spig.Section do
  use Ecto.Schema
  import Ecto.Changeset

  schema "sections" do
    field :name, :string
    field :year, :integer
    field :semester, :string
    field :archived, :boolean
    field :joinable_code, :string
    field :link_active, :boolean
    field :status, :string
    belongs_to :course, Spig.Course
    belongs_to :teacher, Spig.Accounts.User
    # this is a weird way of saying it
    belongs_to :assignment, Spig.Assignment
    many_to_many :students, Spig.Accounts.User, join_through: "section_memberships"

    timestamps(type: :utc_datetime)
  end

  def gen_code() do
    # symbols = ~c"0123456789abcdeghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ"
    # symbol_count = Enum.count(symbols)
    # s = for _ <- 1..14, into: "", do: <<Enum.at(symbols, :rand.uniform(symbol_count))>>
    s = Base.url_encode64(:crypto.strong_rand_bytes(12), urlsafe: true)
    s
  end

  @doc false
  def changeset(section, attrs) do
    section
    |> cast(attrs, [:name, :year, :semester])
    |> validate_length(:name, min: 1, max: 100)
    |> validate_number(:year, greater_than: 1998, less_than: 10000)
    |> validate_required([:name, :year, :semester, :course_id, :joinable_code])
  end

  def status_changeset(section, status) do
    section
    |> cast(%{:status => status}, [:status])
    |> validate_required([:status])
  end

  def assignment_changeset(section, assignment) do
    section
    |> cast(%{:assignment_id => assignment}, [:assignment_id])
  end

  def statuses(),
    do: ["waiting", "writing", "grading individually", "grading in groups", "viewing results"]

  def next_status(status), do: next_status(status, statuses())

  def next_status(status, statuses) do
    if statuses == [] do
      nil
    else
      [a | rest] = statuses

      if a == status do
        if rest == [] do
          nil
        else
          [b | _] = rest
          b
        end
      else
        next_status(status, rest)
      end
    end
  end

  def back_status(status), do: next_status(status, Enum.reverse(statuses()))
end
