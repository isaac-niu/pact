import { Link } from "react-router-dom";
import { useLiveAccount } from "../auth/useLiveAccount.js";
import { api } from "../api.js";

export default function People() {
  const live = useLiveAccount();

  if (!live.live) {
    return (
      <section className="card">
        <h2>Friends</h2>
        <p className="lede">Sign in with Auth0 to add real accounts — not just the ISAAC / MAYA demo desks.</p>
        <button className="btn btn-lime" type="button" onClick={() => live.loginWithRedirect?.({ appState: { returnTo: "/people" } })}>
          Sign in
        </button>
      </section>
    );
  }

  async function request(userId) {
    const token = await live.tokenOf();
    await api("/api/friends", { token, method: "POST", body: { userId } });
    await live.refresh();
  }

  async function accept(userId) {
    const token = await live.tokenOf();
    await api(`/api/friends/${encodeURIComponent(userId)}/accept`, { token, method: "POST" });
    await live.refresh();
  }

  return (
    <div>
      <div className="page-head">
        <div>
          <div className="kicker">{live.me?.name}</div>
          <h2>People</h2>
          <p className="lede slim">Anyone who has signed in once lands here. Friend them, then pitch them.</p>
        </div>
        <Link className="btn btn-lime" to="/create">
          Write a slip
        </Link>
      </div>
      {live.error ? <p className="err">{live.error}</p> : null}
      {live.friends.incoming?.length ? (
        <div className="card">
          <div className="kicker">Incoming</div>
          {live.friends.incoming.map((person) => (
            <div className="people-row" key={person.id}>
              <div>
                <b>{person.name}</b>
                <div className="hint">{person.email || person.id}</div>
              </div>
              <button className="btn btn-lime" type="button" onClick={() => accept(person.id)}>
                Accept
              </button>
            </div>
          ))}
        </div>
      ) : null}
      <div className="card">
        <div className="kicker">Signed-in accounts</div>
        {live.people.length === 0 ? (
          <p className="hint">No other accounts yet. Have a friend open this desk and sign in once.</p>
        ) : (
          live.people.map((person) => (
            <div className="people-row" key={person.id}>
              <div>
                <b>{person.name}</b>
                <div className="hint">{person.email || person.id}</div>
              </div>
              <div className="announcer-row">
                <Link className="btn btn-ghost" to={`/inbox?with=${encodeURIComponent(person.id)}`}>
                  Message
                </Link>
                {person.friend ? null : (
                  <button className="btn btn-ghost" type="button" onClick={() => request(person.id)}>
                    Add friend
                  </button>
                )}
                <Link className="btn btn-lime" to={`/create?vs=${encodeURIComponent(person.id)}`}>
                  Pitch
                </Link>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
