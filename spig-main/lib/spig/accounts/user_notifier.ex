defmodule Spig.Accounts.UserNotifier do
  import Swoosh.Email

  alias Spig.Mailer

  # Delivers the email using the application mailer.
  defp deliver(recipient, subject, body) do
    email =
      new()
      |> to(recipient)
      |> from({"Spig", "spig@example.com"})
      |> subject(subject)
      |> text_body(body)

    with {:ok, _metadata} <- Mailer.deliver(email) do
      {:ok, email}
    end
  end

  # Sends the welcome email
  def deliver_welcome_email(user) do
    deliver(user.email, "Welcome to Spig!", """
      Hello #{user.name},

      Thank you for signing up to Spig. If you have any questions,
      please reach out to someone.
    """)
  end
end
