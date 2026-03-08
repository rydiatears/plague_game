import { useEffect, useMemo, useState } from "react";
import { PHASES, cards } from "./data/cards";
import { artCredits, cardArt, historianSources, reactCardImages } from "./data/art";
import { aboutScreen, titleScreen } from "./data/screens";

const SCALE = 5;

const initialStats = {
  death: 15,
  wealth: 55,
  order: 55,
  faith: 55,
};

const failThresholds = {
  death: 85,
  wealth: 10,
  order: 10,
  faith: 10,
};

const statMeta = {
  death: {
    label: "Death",
    icon: "☠️",
    tone: "death",
    description: "How far the plague has spread. Starts low. If it maxes out, your town is devastated.",
    failText: "Mortality crosses the breaking point. The town survives only as a graveyard with walls.",
  },
  wealth: {
    label: "Wealth",
    icon: "💰",
    tone: "wealth",
    description: "Your food, trade, and treasury. If it bottoms out, famine and collapse follow.",
    failText: "Storehouses, coin, and trade all fail together. Hunger finishes what plague began.",
  },
  order: {
    label: "Order",
    icon: "⚖️",
    tone: "order",
    description: "Law, stability, and social cohesion. If it bottoms out, riots and anarchy follow.",
    failText: "Civic authority gives way. The council can no longer command the streets.",
  },
  faith: {
    label: "Faith",
    icon: "✝️",
    tone: "faith",
    description: "Morale, hope, and spiritual resilience. If it bottoms out, despair takes hold.",
    failText: "Hope and shared duty collapse. The town loses the will to endure together.",
  },
};

function clamp(value) {
  return Math.max(0, Math.min(100, value));
}

function scaleEffects(effects) {
  return Object.fromEntries(
    Object.entries(effects).map(([key, value]) => [key, value * SCALE]),
  );
}

function shuffleWithinPhases(deck) {
  return PHASES.flatMap((phase) => {
    const phaseCards = deck.filter((card) => card.phase === phase.id);
    const copy = [...phaseCards];

    for (let index = copy.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(Math.random() * (index + 1));
      [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
    }

    return copy;
  });
}

function feedbackTone(statKey, delta) {
  if (statKey === "death") {
    return delta < 0 ? "good" : "bad";
  }

  return delta > 0 ? "good" : "bad";
}

function isNearFailure(statKey, value) {
  if (statKey === "death") {
    return value >= failThresholds.death - 15;
  }

  return value <= failThresholds[statKey] + 15;
}

function statTooltip(meta, statKey) {
  const threshold =
    statKey === "death"
      ? `Failure at ${failThresholds.death} or more.`
      : `Failure at ${failThresholds[statKey]} or less.`;

  return `${meta.description} ${threshold}`;
}

function isCitationChunk(chunk) {
  return /\((?:[^()]*pp\.|[^()]*ch\.|[^()]*Lecture|[^()]*Introduction|[^()]*Sourcebook|[^()]*UP, \d{4}|[^()]*\d{2,4}-\d{2,4}|[^()]*\d{4})[^()]*\)/.test(
    chunk,
  );
}

function renderNoteText(text) {
  return text.split(/(\([^()]*\))/g).filter(Boolean).map((chunk, index) => {
    if (isCitationChunk(chunk)) {
      return (
        <span className="note-citation" key={`${chunk}-${index}`}>
          {chunk}
        </span>
      );
    }

    return <span key={`${chunk}-${index}`}>{chunk}</span>;
  });
}

function buildSummary(stats) {
  const deathLine =
    stats.death < 35
      ? "The graves are many, but the town escaped total ruin."
      : stats.death < 60
        ? "The year leaves visible scars in every quarter and family."
        : "Too many doors stayed shut. The town endured, but in mourning.";

  const wealthLine =
    stats.wealth > 50
      ? "Trade, rents, and stores recover enough to steady the town."
      : stats.wealth > 25
        ? "Recovery is uneven. The market lives, but weakly."
        : "Coin, stores, and labor have all been spent nearly to nothing.";

  const orderLine =
    stats.order > 50
      ? "The council preserved enough authority to direct rebuilding."
      : stats.order > 25
        ? "Order survived through strain, fear, and compromise."
        : "The habits of obedience were badly damaged by crisis and panic.";

  const faithLine =
    stats.faith > 50
      ? "Prayer and duty still give the survivors a language for grief."
      : stats.faith > 25
        ? "Faith endured, but in a harder, wearier form."
        : "The plague has left spiritual exhaustion where confidence once stood.";

  return [deathLine, wealthLine, orderLine, faithLine];
}

function outcomeText(outcome) {
  if (outcome.type === "victory") {
    return "The town reaches spring still standing, though altered by loss.";
  }

  return statMeta[outcome.stat].failText;
}

function App() {
  const [deck, setDeck] = useState(() => shuffleWithinPhases(cards));
  const [index, setIndex] = useState(0);
  const [stats, setStats] = useState(initialStats);
  const [history, setHistory] = useState([]);
  const [outcome, setOutcome] = useState(null);
  const [statFeedback, setStatFeedback] = useState({});
  const [activeNote, setActiveNote] = useState(null);
  const [showCredits, setShowCredits] = useState(false);
  const [screen, setScreen] = useState("title");

  const currentCard = deck[index];
  const currentPhase = currentCard
    ? PHASES.find((phase) => phase.id === currentCard.phase)
    : null;
  const currentArtSrc = currentCard
    ? reactCardImages[cardArt[currentCard.id]]
    : null;
  const titleArtSrc = reactCardImages["council_card.jpg"];
  const summary = useMemo(() => buildSummary(stats), [stats]);

  useEffect(() => {
    if (Object.keys(statFeedback).length === 0) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      setStatFeedback({});
    }, 10000);

    return () => window.clearTimeout(timeoutId);
  }, [statFeedback]);

  useEffect(() => {
    if (!activeNote) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      setActiveNote(null);
    }, 15000);

    return () => window.clearTimeout(timeoutId);
  }, [activeNote]);

  useEffect(() => {
    if (!showCredits) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      restart();
    }, 30000);

    return () => window.clearTimeout(timeoutId);
  }, [showCredits]);

  useEffect(() => {
    function handleKeydown(event) {
      if (event.repeat) return;

      if (screen === "title" && event.key === "Enter") {
        event.preventDefault();
        beginGame();
        return;
      }

      if (activeNote && event.key === "Escape") {
        setActiveNote(null);
        return;
      }

      if (activeNote && event.key === " ") {
        event.preventDefault();
        setActiveNote(null);
        return;
      }

      if (screen !== "play" || !currentCard || outcome || activeNote || showCredits) return;

      const key = event.key.toLowerCase();
      if (key === "a") choose("left");
      if (key === "d") choose("right");
    }

    window.addEventListener("keydown", handleKeydown);
    return () => window.removeEventListener("keydown", handleKeydown);
  }, [activeNote, currentCard, outcome, deck, history, index, screen, showCredits, stats]);

  function restart() {
    setDeck(shuffleWithinPhases(cards));
    setIndex(0);
    setStats(initialStats);
    setHistory([]);
    setOutcome(null);
    setStatFeedback({});
    setActiveNote(null);
    setShowCredits(false);
  }

  function beginGame() {
    restart();
    setScreen("play");
  }

  function resolveOutcome(nextStats, nextIndex, nextDeck) {
    if (nextStats.death >= failThresholds.death) {
      return { type: "defeat", stat: "death" };
    }

    for (const stat of ["wealth", "order", "faith"]) {
      if (nextStats[stat] <= failThresholds[stat]) {
        return { type: "defeat", stat };
      }
    }

    if (nextIndex >= nextDeck.length) {
      return { type: "victory" };
    }

    return null;
  }

  function filterDeck(nextHistory) {
    return deck.filter((card, cardIndex) => {
      if (cardIndex <= index) {
        return true;
      }

      if (!card.requires) {
        return true;
      }

      const prerequisite = nextHistory.find(
        (entry) => entry.cardId === card.requires.cardId,
      );

      if (!prerequisite) {
        return false;
      }

      return (
        card.requires.choice === "any" || prerequisite.choice === card.requires.choice
      );
    });
  }

  function choose(side) {
    if (!currentCard || outcome || activeNote) return;

    const option = side === "left" ? currentCard.leftChoice : currentCard.rightChoice;
    const scaledEffects = scaleEffects(option.effects);
    const nextStats = {
      death: clamp(stats.death + (scaledEffects.death ?? 0)),
      wealth: clamp(stats.wealth + (scaledEffects.wealth ?? 0)),
      order: clamp(stats.order + (scaledEffects.order ?? 0)),
      faith: clamp(stats.faith + (scaledEffects.faith ?? 0)),
    };
    const nextHistory = [
      ...history,
      {
        cardId: currentCard.id,
        character: currentCard.character,
        choice: side,
        note: currentCard.historianNote,
      },
    ];
    const nextDeck = filterDeck(nextHistory);
    const nextIndex = index + 1;
    const nextOutcome = resolveOutcome(nextStats, nextIndex, nextDeck);

    setStats(nextStats);
    setHistory(nextHistory);
    setDeck(nextDeck);
    setIndex(nextIndex);
    setOutcome(nextOutcome);
    setStatFeedback(
      Object.fromEntries(Object.entries(scaledEffects).filter(([, value]) => value !== 0)),
    );
    if (currentCard.historianNote) {
      setActiveNote({
        title: currentCard.character,
        text: currentCard.historianNote,
      });
    }
  }

  if (screen === "title") {
    return (
      <div className="title-screen" style={{ "--title-art": `url(${titleArtSrc})` }}>
        <div className="title-screen__overlay">
          <main className="title-screen__content">
            <p className="eyebrow">{titleScreen.setting}</p>
            <h1 className="landing-title">{titleScreen.title}</h1>
            <p className="landing-hook">{titleScreen.hookTitle}</p>
            {titleScreen.paragraphs.map((paragraph) => (
              <p className="landing-copy" key={paragraph}>
                {paragraph}
              </p>
            ))}
            <p className="landing-copy">{titleScreen.statIntro}</p>
            {titleScreen.stats.map((line) => (
              <p className="landing-copy" key={line}>
                {line}
              </p>
            ))}
            <p className="landing-copy">{titleScreen.close}</p>
            <div className="landing-actions">
              <button className="primary-button landing-button" type="button" onClick={beginGame}>
                Begin
              </button>
              <p className="landing-hint">Press Enter to begin</p>
              <button className="text-link" type="button" onClick={() => setScreen("about")}>
                For Parents & Teachers
              </button>
            </div>
          </main>
        </div>
      </div>
    );
  }

  if (screen === "about") {
    return (
      <div className="app-shell">
        <main className="landing-frame">
          <section className="landing-card about-card">
            <p className="eyebrow">For Parents & Teachers</p>
            <h1 className="landing-title">{aboutScreen.title}</h1>
            <p className="landing-copy">{aboutScreen.intro}</p>
            {aboutScreen.sections.map((section) => (
              <section className="about-section" key={section.heading}>
                <h2>{section.heading}</h2>
                {section.paragraphs.map((paragraph) => (
                  <p className="landing-copy" key={paragraph}>
                    {paragraph}
                  </p>
                ))}
              </section>
            ))}
            <button className="ghost-button landing-button" type="button" onClick={() => setScreen("title")}>
              Back to Title Screen
            </button>
          </section>
        </main>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <main className="game-frame">
        <header className="topbar">
          <div>
            <p className="eyebrow">1348-1349 • Council Chronicle</p>
            <h1>The Plague Year</h1>
          </div>
          <button className="ghost-button" type="button" onClick={restart}>
            Restart
          </button>
        </header>

        <section className="stats-panel" aria-label="Town status">
          {Object.entries(statMeta).map(([key, meta]) => {
            const delta = statFeedback[key];
            const tone = delta ? feedbackTone(key, delta) : null;
            const warning = isNearFailure(key, stats[key]);
            const tooltip = statTooltip(meta, key);

            return (
              <div
                className={`stat-card ${meta.tone} ${warning ? "near-failure" : ""} ${tone ? `flash-${tone}` : ""}`}
                key={key}
                title={tooltip}
              >
                <div className="stat-header">
                  <span>{meta.icon}</span>
                  <span>{meta.label}</span>
                  <span className="stat-value">
                    {stats[key]}
                    {delta ? (
                      <span className={`delta-pill ${tone}`}>
                        {delta > 0 ? "+" : ""}
                        {delta}
                      </span>
                    ) : null}
                  </span>
                </div>
                <div
                  className="stat-bar"
                  role="meter"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={stats[key]}
                  aria-label={`${meta.label}: ${stats[key]} out of 100`}
                  title={tooltip}
                >
                  <div className="stat-fill" style={{ width: `${stats[key]}%` }} />
                </div>
              </div>
            );
          })}
        </section>

        {!outcome && currentCard ? (
          <section className="card-stage">
            <article className="card-panel">
              <div className="portrait-frame">
                <div className="portrait-image">
                  {currentArtSrc ? (
                    <img
                      alt={`${currentCard.character} scene`}
                      className="portrait-photo"
                      src={currentArtSrc}
                    />
                  ) : (
                    <span className="portrait-mark" aria-hidden="true">
                      {currentCard.emoji}
                    </span>
                  )}
                </div>
              </div>
              <div className="card-copy">
                <div className="season-marker">
                  <p className="eyebrow">{currentCard.character}</p>
                  <p className="season-text">{currentPhase?.season}</p>
                </div>
                <p>{currentCard.text}</p>
              </div>
            </article>

            <section className="choice-grid" aria-label="Choices">
              {[
                { key: "left", option: currentCard.leftChoice, prompt: "Press A" },
                { key: "right", option: currentCard.rightChoice, prompt: "Press D" },
              ].map(({ key, option, prompt }) => (
                <button
                  className="choice-card"
                  key={key}
                  type="button"
                  onClick={() => choose(key)}
                  disabled={Boolean(activeNote || showCredits)}
                >
                  <span className="choice-side">{prompt}</span>
                  <strong>{option.label}</strong>
                  <div className="preview-row" aria-hidden="true">
                    {Object.keys(option.effects).length === 0 ? (
                      <span className="preview-chip">No obvious shift</span>
                    ) : (
                      Object.keys(option.effects).map((stat) => (
                        <span className="preview-chip" key={stat}>
                          {statMeta[stat].label}
                        </span>
                      ))
                    )}
                  </div>
                </button>
              ))}
            </section>
          </section>
        ) : (
          <section className="end-panel">
            <p className="eyebrow">
              {outcome?.type === "victory" ? "Year End" : "Council Fallen"}
            </p>
            <h2>{outcomeText(outcome)}</h2>
            <div className="summary-block">
              {summary.map((line) => (
                <p key={line}>{line}</p>
              ))}
            </div>
            <div className="historian-block">
              <h3>Historian's Notes</h3>
              <p>
                Medieval communities made decisions without modern epidemiology,
                antibiotics, or strong central administration. Their choices were
                morally serious, materially constrained, and often tragic.
              </p>
              {history.map((entry) => (
                <p key={entry.cardId}>
                  <strong>{entry.character}:</strong> {entry.note}
                </p>
              ))}
            </div>
            <button
              className="primary-button"
              type="button"
              onClick={() => setShowCredits(true)}
            >
              Continue to Credits
            </button>
          </section>
        )}

        <aside className="footer-note">
          <p>
            Keyboard support: press <kbd>A</kbd> for the left choice and <kbd>D</kbd> for
            the right choice.
          </p>
        </aside>

        {activeNote ? (
          <div className="note-overlay" role="dialog" aria-modal="false">
            <div className="note-card">
              <div className="note-header">
                <div>
                  <p className="eyebrow">Historian's Note</p>
                  <h3>{activeNote.title}</h3>
                </div>
                <button
                  className="ghost-button"
                  type="button"
                  onClick={() => setActiveNote(null)}
                >
                  Dismiss
                </button>
              </div>
              <p className="note-body">{renderNoteText(activeNote.text)}</p>
              <p className="note-hint">Press Space to dismiss</p>
            </div>
          </div>
        ) : null}

        {showCredits ? (
          <div className="credits-overlay" role="dialog" aria-modal="false">
            <div className="credits-card">
              <div className="note-header">
                <div>
                  <p className="eyebrow">Credits</p>
                  <h3>Sources and Artwork</h3>
                </div>
                <button className="ghost-button" type="button" onClick={restart}>
                  Close and Restart
                </button>
              </div>
              <p>
                This screen will close and restart automatically after 30 seconds.
              </p>
              <div className="credits-grid">
                <section className="credits-section">
                  <h4>Historian Sources</h4>
                  {historianSources.map((source) => (
                    <p key={source}>{source}</p>
                  ))}
                </section>
                <section className="credits-section">
                  <h4>Artwork Sources</h4>
                  {artCredits.map(([file, source]) => (
                    <p key={file}>
                      <strong>{file}</strong>: {source}
                    </p>
                  ))}
                </section>
              </div>
            </div>
          </div>
        ) : null}
      </main>
    </div>
  );
}

export default App;
