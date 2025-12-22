defmodule SpigWeb.TestController do
  use SpigWeb, :controller

  def trigger_error(_conn, _params) do
    # Deliberately raise an error to test the 500 error page
    raise "Test 500 error page"
  end
end
