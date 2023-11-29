customElements.define('page-entry', class PageEntry extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    this.render();
  }

  static get observedAttributes() {
    return ['title', 'url', 'date', 'status', 'is-current'];
  }

  // eslint-disable-next-line no-unused-vars
  attributeChangedCallback(name, oldValue, newValue) {
    this.render();
  }

  render() {
    this.shadowRoot.innerHTML = `<link rel="stylesheet" href="../3rdparty/pico.min.css">
<style>
  :host {
    border-radius: 10px;
    background-color: white;
    margin: 2px;
    padding: 5px;
    display: flex;
    align-items: center;
  }

  @media only screen and (prefers-color-scheme: dark) {
    :host {
      background-color: #1a1a1a;
    }
  }

  :host([is-current="true"]) {
    background-color: #d4f5ff;
  }

  :host([is-current="true"][status="done"]) {
    background-color: #ecffb6;
  }

  @media only screen and (prefers-color-scheme: dark) {
    :host([is-current="true"]) {
      background-color: #001c23;
    }

    :host([is-current="true"][status="done"]) {
      background-color: #363d23;
    }
  }

  a:any-link {
    flex: 1 0 auto;
    display: block;

    --primary: var(--color);
  }

  a p {
    margin: 0;
    max-width: 450px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  a .title {
    font-weight: bold;
  }

  a .metadata {
    font-size: 0.8em;
  }

  button {
    width: 21px;
    padding: 4px;
    margin: 0;
    font-size: 0.7rem;
  }

  @media only screen and (prefers-color-scheme: dark) {
    button img {
      filter: invert(1);
    }
  }
</style>

<a href="" target="_blank">
    <p class="title"></p>
    <p class="metadata">
        <span class="hostname"></span>
        -
        <span class="date"></span>
    </p>
</a>
<button class="outline"><img src="${chrome.runtime.getURL('images/trash-can.svg')}" alt="remove"></button>
    `;

    // attributes are not present from beginning, so we have to assume they are optional
    this.shadowRoot.querySelector('a').href = this.getAttribute('url');
    this.shadowRoot.querySelector('p.title').textContent = this.getAttribute('title');

    this.shadowRoot.querySelector('span.hostname').textContent = this.getAttribute('url')
      ? new URL(this.getAttribute('url')).hostname
      : '';

    this.shadowRoot.querySelector('span.date').textContent = this.getAttribute('date')
      ? new Date(this.getAttribute('date')).toLocaleDateString()
      : '';

    this.shadowRoot.querySelector('button').addEventListener('click', () => {
      this.dispatchEvent(new CustomEvent('remove', { detail: { url: this.getAttribute('url') } }));
    });
  }
});
