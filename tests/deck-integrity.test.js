import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { PHASES, cards } from "../src/data/cards.js";
import { artCredits, cardArt, historianSources, reactCardImages } from "../src/data/art.js";

const statKeys = new Set(["death", "wealth", "order", "faith"]);
const choiceKeys = new Set(["left", "right", "any"]);
const phaseIds = PHASES.map((phase) => phase.id);
const phaseOrder = new Map(phaseIds.map((phaseId, index) => [phaseId, index]));
const cardsById = new Map(cards.map((card) => [card.id, card]));
const usedArtFiles = new Set(Object.values(cardArt));
const creditedArtFiles = new Set(artCredits.map(([file]) => file));

function test(name, run) {
  run();
  console.log(`ok - ${name}`);
}

test("deck has unique phases and cards in known phases", () => {
  assert.equal(new Set(phaseIds).size, PHASES.length, "phase ids must be unique");
  assert.equal(cardsById.size, cards.length, "card ids must be unique");

  for (const phase of PHASES) {
    assert.ok(phase.id, "phase must have an id");
    assert.ok(phase.label, `${phase.id} must have a label`);
    assert.ok(phase.season, `${phase.id} must have a season`);
    assert.ok(
      cards.some((card) => card.phase === phase.id),
      `${phase.id} must contain at least one card`,
    );
  }

  for (const card of cards) {
    assert.ok(phaseOrder.has(card.phase), `${card.id} uses unknown phase ${card.phase}`);
  }
});

test("cards have valid playable content", () => {
  for (const card of cards) {
    assert.ok(card.id, "card must have an id");
    assert.ok(card.character, `${card.id} must have a character`);
    assert.ok(card.text, `${card.id} must have prompt text`);
    assert.ok(card.historianNote?.trim(), `${card.id} must have a historian note`);

    for (const choiceName of ["leftChoice", "rightChoice"]) {
      const choice = card[choiceName];
      assert.ok(choice, `${card.id} must have ${choiceName}`);
      assert.ok(choice.label, `${card.id} ${choiceName} must have a label`);
      assert.ok(choice.effects, `${card.id} ${choiceName} must have effects`);

      for (const [stat, value] of Object.entries(choice.effects)) {
        assert.ok(statKeys.has(stat), `${card.id} ${choiceName} uses unknown stat ${stat}`);
        assert.equal(typeof value, "number", `${card.id} ${choiceName} ${stat} must be numeric`);
        assert.ok(Number.isFinite(value), `${card.id} ${choiceName} ${stat} must be finite`);
      }
    }
  }
});

test("conditional cards reference reachable prerequisites", () => {
  for (const card of cards.filter((candidate) => candidate.requires)) {
    const prerequisite = cardsById.get(card.requires.cardId);

    assert.ok(prerequisite, `${card.id} requires missing card ${card.requires.cardId}`);
    assert.ok(choiceKeys.has(card.requires.choice), `${card.id} has invalid required choice`);

    if (card.requires.choice !== "any") {
      const requiredChoice = `${card.requires.choice}Choice`;
      assert.ok(prerequisite[requiredChoice], `${card.id} requires missing ${requiredChoice}`);
    }

    assert.ok(
      phaseOrder.get(prerequisite.phase) < phaseOrder.get(card.phase),
      `${card.id} must require a card from an earlier phase because cards shuffle within phases`,
    );
  }
});

test("art mappings cover every card and point to existing files", () => {
  for (const card of cards) {
    const artFile = cardArt[card.id];

    assert.ok(artFile, `${card.id} must have card art`);
    assert.ok(reactCardImages[artFile], `${card.id} art file ${artFile} is not importable`);
    assert.ok(creditedArtFiles.has(artFile), `${card.id} art file ${artFile} is not credited`);
    assert.ok(
      existsSync(fileURLToPath(reactCardImages[artFile])),
      `${card.id} art file ${artFile} does not exist`,
    );
  }

  for (const cardId of Object.keys(cardArt)) {
    assert.ok(cardsById.has(cardId), `art mapping references unknown card ${cardId}`);
  }
});

test("source and credit lists are populated", () => {
  assert.ok(historianSources.length > 0, "historian sources must not be empty");
  assert.ok(artCredits.length > 0, "art credits must not be empty");

  for (const source of historianSources) {
    assert.ok(source.trim(), "historian source entries must not be blank");
  }

  for (const [file, source] of artCredits) {
    assert.ok(file.trim(), "art credit file entries must not be blank");
    assert.ok(source.trim(), `${file} must have an art credit source`);
  }

  for (const artFile of usedArtFiles) {
    assert.ok(creditedArtFiles.has(artFile), `${artFile} must be credited`);
  }
});
