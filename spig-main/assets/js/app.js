// If you want to use Phoenix channels, run `mix help phx.gen.channel`
// to get started and then uncomment the line below.
// import "./user_socket.js"

// You can include dependencies in two ways.
//
// The simplest option is to put them in assets/vendor and
// import them using relative paths:
//
//     import "../vendor/some-package.js"
//
// Alternatively, you can `npm install some-package --prefix assets` and import
// them using a path starting with the package name:
//
//     import "some-package"
//

// Include phoenix_html to handle method=PUT/DELETE in forms and buttons.
import "phoenix_html";
// Establish Phoenix Socket and LiveView configuration.
import { Socket } from "phoenix";
import { LiveSocket } from "phoenix_live_view";
import topbar from "../vendor/topbar";
import { CodeEditorHook } from "../../deps/live_monaco_editor/priv/static/live_monaco_editor.esm";

let csrfToken = document
  .querySelector("meta[name='csrf-token']")
  .getAttribute("content");
let liveSocket = new LiveSocket("/live", Socket, {
  longPollFallbackMs: 2500,
  params: { _csrf_token: csrfToken },
  hooks: { CodeEditorHook },
  dom: {
    onBeforeElUpdated(from, to) {
      // check if it is a dialog
      if (to.nodeName.toLowerCase() == "dialog") {
        // ignore open changes
        if (from.open != to.open) {
          to.open = from.open;
        }
      }
    },
  },
});

// Show progress bar on live navigation and form submits
topbar.config({ barColors: { 0: "#29d" }, shadowColor: "rgba(0, 0, 0, .3)" });
window.addEventListener("phx:page-loading-start", (_info) => topbar.show(300));
window.addEventListener("phx:page-loading-stop", (_info) => topbar.hide());

// connect if there are any LiveViews on the page
liveSocket.connect();

// expose liveSocket on window for web console debug logs and latency simulation:
// >> liveSocket.enableDebug()
// >> liveSocket.enableLatencySim(1000)  // enabled for duration of browser session
// >> liveSocket.disableLatencySim()

window.liveSocket = liveSocket;

window.addEventListener("lme:editor_mounted", (ev) => {
  const hook = ev.detail.hook;

  // https://microsoft.github.io/monaco-editor/docs.html#interfaces/editor.IStandaloneCodeEditor.html
  const editor = ev.detail.editor.standalone_code_editor;
  window.codeEditor = {
    editor,
    hook,
  };
});

// remnant of emergency spig
if(location.pathname.startsWith("/section/")) {
  function collectRubricResponses(form) {
    const c = {}
    for(const cb of form.querySelectorAll("input[type=checkbox]")) {
      const pair = [
        cb.name,
        cb.checked
      ]
      // this is varsity webdev
      c[pair[0].split("-")[1]] = pair[1]
    }
    return c;
  }

  function submitEvaluation(e) {
    e.preventDefault()
    const c = collectRubricResponses(e.target)
    if(e.target.dataset.status == "grading individually") {
      window.codeEditor.hook.pushEvent("submitEvaluation", c)
    } else {
      window.codeEditor.hook.pushEvent("agreement", c)
    }
    console.log("evaluation sent!", c)
    e.target.reset()
  }

  window.addEventListener("phx:scoreUpdate", e => {
    const data = e.detail;
    console.log("score update data", data)
    const c = data.evaluation
    Object.keys(c).forEach(k => {
      const elem = document.querySelector('input[name="c-' + k + '"]')
      if(elem) {
        elem.checked = c[k]
      }
    })
  })

  window.addEventListener("phx:hydrateGradingForm", e => {
    console.log("hydrating grading form!")
    addPizzazz()
  })

  window.addEventListener("phx:setEditorCode", e => {
    console.log("changing code", e)
    if(window.codeEditor)
      window.codeEditor.editor.setValue(e.detail.code)
  })

  function addPizzazz() {
    const form = document.getElementById("evaluationForm");
    if (!form) {
      console.log("form not found")
      return
    }
    if(form.dataset.hydrated) { return } else {
      form.dataset.hydrated = true
    }
    console.log("actually hydrating.")
    form.onsubmit = e => { submitEvaluation(e) }
    for(const cb of form.querySelectorAll("input[type=checkbox]")) {
      cb.oninput = () => {
        if(form.dataset.status == "grading in groups") {
          // send it back!
          const c = collectRubricResponses(form)
          window.codeEditor.hook.pushEvent("updateEval", c)
        }
      }
    }
  }
}