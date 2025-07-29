import React from "react";
import clsx from "clsx";
import Link from "@docusaurus/Link";
import useDocusaurusContext from "@docusaurus/useDocusaurusContext";
import Layout from "@theme/Layout";
import Translate, { translate } from "@docusaurus/Translate";

import styles from "./index.module.css";

function HomepageHeader() {
  const { siteConfig } = useDocusaurusContext();
  return (
    <header className={clsx("hero hero--primary", styles.heroBanner)}>
      <div className="container">
        <h1 className="hero__title">{siteConfig.title}</h1>
        <p className="hero__subtitle">{siteConfig.tagline}</p>
        <div className={styles.buttons}>
          <Link
            className="button button--secondary button--lg"
            to="/docs/introduction/prologue"
          >
            <Translate
              id="homepage.startLearning"
              description="The homepage start learning button label"
            >
              Start learning!
            </Translate>
          </Link>
        </div>
      </div>
    </header>
  );
}

export default function Home() {
  const { siteConfig } = useDocusaurusContext();
  return (
    <Layout
      title={translate({
        id: "homepage.title",
        message: siteConfig.title,
        description: "The homepage title",
      })}
      description={translate({
        id: "homepage.tagline",
        message: siteConfig.tagline,
        description: "The homepage tagline",
      })}
    >
      <HomepageHeader />
    </Layout>
  );
}
