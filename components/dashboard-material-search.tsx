"use client";

import Link from "next/link";
import { useDeferredValue, useState } from "react";

export type DashboardMaterialSearchItem = {
  id: string;
  title: string;
  description: string;
  level: string;
  subject: string;
  typeLabel: string;
  termLabel: string;
  year: string;
  setLabel: string | null;
  href: string;
};

type DashboardMaterialSearchProps = {
  materials: DashboardMaterialSearchItem[];
};

const allMaterialTypes = "all";

export function DashboardMaterialSearch({ materials }: DashboardMaterialSearchProps) {
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState(allMaterialTypes);
  const deferredQuery = useDeferredValue(query.trim().toLowerCase());
  const typeOptions = Array.from(new Set(materials.map((item) => item.typeLabel))).sort((left, right) =>
    left.localeCompare(right)
  );
  const filteredMaterials = materials.filter((item) => {
    const matchesType = typeFilter === allMaterialTypes || item.typeLabel === typeFilter;
    const searchableText = [
      item.title,
      item.description,
      item.level,
      item.subject,
      item.typeLabel,
      item.termLabel,
      item.year,
      item.setLabel ?? ""
    ]
      .join(" ")
      .toLowerCase();

    return matchesType && (!deferredQuery || searchableText.includes(deferredQuery));
  });

  return (
    <div className="dashboard-material-search">
      <div className="dashboard-material-search-controls">
        <label className="field dashboard-material-search-field">
          <span>Search materials</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search notes, assessments, schemes, subjects, levels..."
          />
        </label>

        <label className="field dashboard-material-search-filter">
          <span>Filter type</span>
          <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}>
            <option value={allMaterialTypes}>All materials</option>
            {typeOptions.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </label>

        <div className="dashboard-material-search-count">
          <span className="subtle">Results</span>
          <strong>
            {filteredMaterials.length} of {materials.length}
          </strong>
        </div>
      </div>

      {filteredMaterials.length > 0 ? (
        <div className="dashboard-material-results">
          {filteredMaterials.map((item) => (
            <article key={item.id} className="dashboard-material-result">
              <div className="dashboard-material-result-head">
                <div>
                  <span className="eyebrow">{item.typeLabel}</span>
                  <h3>{item.title}</h3>
                </div>
                <span className="pill">
                  {item.year} {item.termLabel}
                </span>
              </div>

              <p className="subtle">{item.description || "Uploaded learning material."}</p>

              <div className="dashboard-material-result-meta">
                <span>{item.level}</span>
                <span>{item.subject}</span>
                {item.setLabel ? <span>{item.setLabel}</span> : null}
              </div>

              <div className="dashboard-material-result-actions">
                <Link href={item.href} className="button-secondary">
                  Open material
                </Link>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="dashboard-material-empty">
          <h3>No matching materials found.</h3>
          <p className="subtle">Try searching by subject, grade, term, set, or material type.</p>
        </div>
      )}
    </div>
  );
}
