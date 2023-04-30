type Effect = () => void;

type Signal<T> = {
  cur: () => T;
  set: (next: T) => void;
  addEffect: (effect: Effect) => void;
};

const signal = <T>(value: T): Signal<T> => {
  const effects = new Set<Effect>();
  return {
    cur: () => value,
    set: (next: T) => {
      value = next;
      effects.forEach((effect) => effect());
    },
    addEffect: (effect: Effect) => {
      effect();
      effects.add(effect);
    },
  };
};

const addEffect = (effect: () => void, ...signals: Signal<any>[]) =>
  signals.forEach((signal) => signal.addEffect(effect));

const h = <T extends keyof HTMLElementTagNameMap>(
  tag: T,
  props: Partial<HTMLElementTagNameMap[T]> = {},
  ...children: (HTMLElement | string)[]
) => {
  const element = document.createElement(tag);
  Object.entries(props).forEach(([key, value]) =>
    element.setAttribute(key, String(value))
  );

  children.forEach((child) => {
    if (typeof child === "string")
      element.appendChild(document.createTextNode(child));
    else element.appendChild(child);
  });

  return element;
};

function For<T>(signal: Signal<T[]>, render: (item: T) => HTMLElement) {
  const container = h("span");

  addEffect(() => {
    container.innerHTML = "";
    signal.cur().forEach((item) => container.appendChild(render(item)));
  }, signal);

  return container;
}

function If(signal: Signal<boolean>, render: () => HTMLElement) {
  const container = h("span");

  addEffect(() => {
    container.innerHTML = "";
    if (signal.cur()) container.appendChild(render());
  }, signal);

  return container;
}

// ======== APP CODE =======

function TodoInput(onAddTodo: (todo: string) => void) {
  const textInput = h("input", {
    type: "text",
    placeholder: "What needs to be done?",
  });
  const form = h("form", {}, textInput);

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    onAddTodo(textInput.value);
    textInput.value = "";
  });

  return form;
}

function ActionSpan(text: string, onClick: () => void) {
  const span = h("span", {}, text);
  span.addEventListener("click", onClick);
  return span;
}

function Todo(todo: Todo, onAdd: () => void, onToggle: () => void) {
  const mouseOver = signal(false);

  const label = h(
    "label",
    {},
    h("input", { type: "checkbox", ...(todo.done ? { checked: true } : {}) }),
    " ",
    todo.text,
    " ",
    If(mouseOver, () => ActionSpan("❌", onAdd))
  );
  label.style.opacity = todo.done ? "0.5" : "1";

  label.onmouseenter = () => mouseOver.set(true);
  label.onmouseleave = () => mouseOver.set(false);
  label.querySelector("input")?.addEventListener("change", onToggle);

  return label;
}

type Todo = { text: string; done: boolean };

function App() {
  const todos = signal<Todo[]>([]);
  const removeTodo = (todo: string) =>
    todos.set(todos.cur().filter((t) => t.text !== todo));
  const todosExist = () => todos.cur().length > 0;

  return h(
    "div",
    {},
    h("h1", {}, "to do app"),
    TodoInput((todo) =>
      todos.set([...todos.cur(), { text: todo, done: false }])
    ),
    For(todos, (todo) =>
      Todo(
        todo,
        () => removeTodo(todo.text),
        () => {
          todo.done = !todo.done;
          todos.set(todos.cur());
        }
      )
    )
  );
}

document.querySelector("#app")?.appendChild(App());
