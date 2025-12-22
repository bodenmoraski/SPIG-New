defmodule SpigWeb.Router do
  use SpigWeb, :router

  import SpigWeb.UserAuth
  import SpigWeb.Authorization

  pipeline :browser_no_csrf do
    plug :accepts, ["html"]
    plug :fetch_session
    plug :fetch_live_flash
    plug :put_root_layout, html: {SpigWeb.Layouts, :root}
    plug :put_secure_browser_headers
    plug :fetch_current_user
  end

  pipeline :browser do
    plug :browser_no_csrf
    plug :protect_from_forgery
  end

  pipeline :api do
    plug :accepts, ["json"]
  end

  scope "/", SpigWeb do
    # General open-access routes
    pipe_through :browser

    # Add this line
    get "/corp", CorporateController, :home
    get "/contact", CorporateController, :contact
  end

  # Enable LiveDashboard and Swoosh mailbox preview in development
  if Application.compile_env(:spig, :dev_routes) do
      # If you want to use the LiveDashboard in production, you should put
    # it behind authentication and allow only admins to access it.
    # If your application does not have an admins-only section yet,
    # you can use Plug.BasicAuth to set up some basic authentication
    # as long as you are also using SSL (which you should anyway).
    import Phoenix.LiveDashboard.Router

    scope "/dev" do
      pipe_through :browser

      live_dashboard "/dashboard", metrics: SpigWeb.Telemetry
      forward "/mailbox", Plug.Swoosh.MailboxPreview
    end
  end

  ## Authentication routes

  def google_csrf(conn, _opts) do
    cookie = conn.req_cookies["g_csrf_token"]
    body = conn.body_params["g_csrf_token"]

    if cookie == nil || body == nil || cookie != body do
      conn
      |> put_view(SpigWeb.ErrorHTML)
      |> render(:"400.html")
      |> halt()
    else
      conn
    end
  end

  scope "/", SpigWeb do
    # Login pages, stuff that users don't need to see
    pipe_through [:browser, :redirect_if_user_is_authenticated]

    get "/", PageController, :home
  end

  scope "/", SpigWeb do
    # Special Google callback
    pipe_through [:browser_no_csrf, :google_csrf, :redirect_if_user_is_authenticated]

    post "/auth/callback", UserSessionController, :create
  end

  scope "/", SpigWeb do
    # Routes for signed in users only!
    pipe_through [:browser, :require_authenticated_user]

    live_session :require_authenticated_user,
      on_mount: [{SpigWeb.UserAuth, :ensure_authenticated}] do
      live "/home", Live.Courses, :index

      # courses are basically just section groups
      # so really only teachers need to see that
      scope "/course" do
        pipe_through :course_route

        scope "/:id" do
          live "/", Live.Course, :index
          live "/settings", Live.CourseSettings, :index
          live "/section/:sec_id", Live.ManageSection, :index
          live "/rubric/:rub_id", Live.Rubric, :index
          live "/assignment/:assign_id", Live.Assignment, :show
        end
      end

      scope "/section" do
        live "/", Live.Sections, :index
        live "/join/:code", Live.Join, :index
        live "/:id", Live.StudentView, :index
      end
    end
  end

  scope "/test", SpigWeb do
    pipe_through :browser

    get "/500", TestController, :trigger_error
  end

  scope "/", SpigWeb do
    pipe_through [:browser]

    delete "/auth/logout", UserSessionController, :delete

    live_session :current_user,
      on_mount: [{SpigWeb.UserAuth, :mount_current_user}] do
    end
  end
end
