import React from "react";
import { render, screen } from "@testing-library/react-native";
import ProfessionalScreen from "../app/[slug]";
import * as Api from "../src/services/api";

jest.mock("expo-router", () => ({
  useLocalSearchParams: () => ({ slug: "john-doe" }),
}));

describe("ProfessionalScreen", () => {
  const professional = {
    id: "p1",
    full_name: "John Doe",
    display_name: "John Doe",
    bio: "Bio sample",
    services: [],
    avatar_url: null,
  };

  it("renders loading state correctly", () => {
    jest
      .spyOn(Api, "getProfessionalBySlug")
      .mockImplementation(() => new Promise(() => {}));

    const { getByText } = render(<ProfessionalScreen />);
    expect(getByText(/Carregando profissional/i)).toBeTruthy();
  });

  it("renders error state when API fails", async () => {
    jest
      .spyOn(Api, "getProfessionalBySlug")
      .mockRejectedValue(new Error("API falhou"));

    const { findByText } = render(<ProfessionalScreen />);
    expect(await findByText(/API falhou/i)).toBeTruthy();
  });

  it("renders no-data state when API returns null", async () => {
    jest.spyOn(Api, "getProfessionalBySlug").mockResolvedValue(null as any);

    const { findByText } = render(<ProfessionalScreen />);
    expect(await findByText(/Profissional não encontrado/i)).toBeTruthy();
  });

  it("renders profile and services when data exists", async () => {
    jest
      .spyOn(Api, "getProfessionalBySlug")
      .mockResolvedValue(professional as any);

    const { findByText } = render(<ProfessionalScreen />);

    expect(await findByText(/John Doe/i)).toBeTruthy();
    expect(await findByText(/Bio sample/i)).not.toBeNull();
  });
});
