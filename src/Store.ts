import { domain } from "./Domain";
import {
  activateSection,
  addCategory,
  addDashboard,
  addDataSource,
  addSection,
  deleteSection,
  loadDefaults,
  toggleDashboard,
} from "./Events";
import { ISection, IStore } from "./interfaces";
import { generateUid } from "./utils/uid";

export const $store = domain
  .createStore<IStore>({
    categories: [],
    dashboards: [],
    visualizations: [],
    dashboard: {
      id: generateUid(),
      sections: [],
      published: false,
    },
    category: "",
    section: "",
    visualization: "",
    organisationUnits: [],
    hasDashboards: false,
    hasDefaultDashboard: false,
    dataSources: [],
  })
  .on(loadDefaults, (state, { dashboards, categories, organisationUnits }) => {
    return {
      ...state,
      dashboards,
      categories,
      organisationUnits,
    };
  })
  .on(addCategory, (state, category) => {
    return {
      ...state,
      categories: [...state.categories, category],
    };
  })
  .on(addDataSource, (state, dataSource) => {
    return {
      ...state,
      dataSources: [...state.dataSources, dataSource],
    };
  })
  .on(addDashboard, (state, dashboard) => {
    return {
      ...state,
      dashboard: dashboard,
    };
  })
  .on(addSection, (state) => {
    const id = generateUid();
    const layout = {
      i: id,
      x: 0,
      y: 0,
      w: 2,
      h: 2,
    };

    const currentSection: ISection = {
      layout: { md: layout },
      name: "test",
      id,
    };
    return {
      ...state,
      section: id,
      dashboard: {
        ...state.dashboard,
        sections: [...state.dashboard.sections, currentSection],
      },
    };
  })
  .on(deleteSection, (state, section) => {
    const sections = state.dashboard.sections.filter((s) => s.id !== section);
    return {
      ...state,
      dashboard: { ...state.dashboard, sections },
      section: "",
    };
  })
  .on(activateSection, (state, section) => {
    return { ...state, section };
  })
  .on(toggleDashboard, (state, published) => {
    return { ...state, dashboard: { ...state.dashboard, published } };
  });

export const $layout = $store.map((state) => {
  const md = state.dashboard.sections.map((s) => s.layout.md);
  return { md };
});
