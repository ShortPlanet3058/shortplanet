import { describe, expect, it } from "vitest";
import { check, tidy } from "../src/checker";

const entry = (e: Partial<{ name: string; org: string; word: string }>) => ({ name: "", org: "", word: "", ...e });

describe("check lets ordinary entries through", () => {
  it.each([
    { name: "Léa", org: "Capgemini", word: "hello from Lyon" },
    { name: "Jean-Luc", org: "Epitech Lyon", word: "Super portfolio !" },
    { name: "Marie Anne", org: "Société Générale", word: "bravo 👏" },
    { word: "salut de Paris" },
    { name: "Chloé", org: "Ubisoft", word: "computer magic" },
    { name: "Noah", org: "BNP Paribas", word: "keep building" },
    { org: "École 42", word: "on se voit au hackathon" },
    { name: "O'Neil", word: "❤️" },
    { name: "Hugo", org: "Thales", word: "très beau travail" },
  ])("%o", (e) => expect(check(entry(e))).toBeNull());

  // words that contain an insult's letters without being one
  it.each(["Nazir", "Pornic", "Montenegro", "Negroni time", "bombe à retardement", "Dickens fan", "Scholastique",
    "Assassin's Creed", "Grenoble", "Constance", "Arsenal", "Conference", "Pascal", "Hello from Montpellier", "Capucine",
    "Shrewsbury", "Christophe", "Strasbourg", "schtroumpf", "Ljubljana", "Twelve", "Rhythm", "Saint-Étienne", "Constitution"])(
    "%s", (word) => expect(check(entry({ word }))).toBeNull());
});

describe("check stops", () => {
  it.each<[Partial<{ name: string; org: string; word: string }>, string, string]>([
    [{ word: "you are a b1tch" }, "word", "notKind"],
    [{ word: "connard" }, "word", "notKind"],
    [{ word: "c o n n a r d" }, "word", "notKind"],
    [{ word: "c'est nul" }, "word", "notKind"],
    [{ word: "n4zi" }, "word", "notKind"],
    [{ word: "vote trump" }, "word", "notKind"],
    [{ word: "worst portfolio" }, "word", "notKind"],
    [{ word: "<script>" }, "word", "notKind"],
    [{ word: "see www.spam.com" }, "word", "noContact"],
    [{ word: "call 06 12 34 56 78" }, "word", "noContact"],
    [{ word: "me@mail.fr" }, "word", "noContact"],
    [{ word: "asdfghjk" }, "word", "unclear"],
    [{ word: "aaaaaaa" }, "word", "unclear"],
    [{ word: "!!!!" }, "word", "unclear"],
    [{ name: "Elon", org: "Tesla" }, "name", "notName"],
    [{ name: "Jean Pierre Martin" }, "name", "notName"],
    [{ name: "x_x" }, "name", "notName"],
    [{ org: "!!" }, "org", "unclear"],
    [{ word: "x".repeat(33) }, "word", "tooLong"],
  ])("%o", (e, field, reason) => expect(check(entry(e))).toEqual([field, reason]));
});

it("tidy keeps strings, trims them and drops everything else", () => {
  expect(tidy({ name: "  Léa  ", org: 42, word: "hello   there" })).toEqual({ name: "Léa", org: "", word: "hello there" });
});
