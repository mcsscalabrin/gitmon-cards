import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { StatBadge } from "@/components/ui/StatBadge";

describe("StatBadge", () => {
  it("renderiza label e valor", () => {
    render(<StatBadge label="Stars" value={42} />);
    expect(screen.getByText("Stars")).toBeInTheDocument();
    expect(screen.getByText("42")).toBeInTheDocument();
  });

  it("formata valores abaixo de 1000 sem sufixo k", () => {
    render(<StatBadge label="Forks" value={999} />);
    expect(screen.getByText("999")).toBeInTheDocument();
  });

  it("formata valores entre 1000 e 9999 com 1 casa decimal", () => {
    render(<StatBadge label="Stars" value={1234} />);
    expect(screen.getByText("1.2k")).toBeInTheDocument();
  });

  it("formata valores >= 10000 sem casa decimal", () => {
    render(<StatBadge label="Stars" value={15000} />);
    expect(screen.getByText("15k")).toBeInTheDocument();
  });

  it("renderiza valor zero", () => {
    render(<StatBadge label="Forks" value={0} />);
    expect(screen.getByText("0")).toBeInTheDocument();
  });

  it("aplica className extra", () => {
    const { container } = render(<StatBadge label="Stars" value={1} className="extra" />);
    expect(container.firstChild).toHaveClass("stat-badge", "extra");
  });
});
