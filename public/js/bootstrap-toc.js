/*!
 * Original License:
 * Copyright 2015 Aidan Feldman
 * Licensed under MIT (https://github.com/afeld/bootstrap-toc/blob/gh-pages/LICENSE.md) */

/*
 * Modified by Anders Hessellund Jensen
 */

// return all matching elements in the set, or their descendants

import $ from 'jquery';

const findOrFilter = ($el, selector) => {
  // http://danielnouri.org/notes/2011/03/14/a-jquery-find-that-also-finds-the-root-element/
  // http://stackoverflow.com/a/12731439/358804
  const $descendants = $el.find(selector);
  return $el.filter(selector).add($descendants).filter(':not([data-toc-skip])');
};

const generateUniqueIdBase =  (el) => {
  const text = $(el).text();
  const anchor = text.trim().toLowerCase().replace(/[^A-Za-z0-9]+/g, '-');
  return anchor || el.tagName.toLowerCase();
};

const generateUniqueId =  (el) => {
  const anchorBase = generateUniqueIdBase(el);
  for (let i = 0; ; i++) {
    let anchor = anchorBase;
    if (i > 0) {
      // add suffix
      anchor += '-' + i;
    }
    // check if ID already exists
    if (!document.getElementById(anchor)) {
      return anchor;
    }
  }
};

const generateAnchor = (el) => {
  if (el.id) {
    return el.id;
  } else {
    const anchor = generateUniqueId(el);
    el.id = anchor;
    return anchor;
  }
};

const createNavList = () => {
  return $('<ul class="nav nav-pills flex-column"></ul>');
};

const createChildNavList = ($parent) => {
  const $childList = createNavList();
  $parent.append($childList);
  return $childList;
};

const generateNavEl = (anchor, text) => {
  const $a = $('<a class="nav-link"></a>');
  $a.attr('href', '#' + anchor);
  $a.text(text);
  const $li = $('<li class="nav-item"></li>');
  $li.append($a);
  return $li;
};

const generateNavItem = (headingEl) => {
  const anchor = generateAnchor(headingEl);
  const $heading = $(headingEl);
  const text = $heading.data('toc-text') || $heading.text();
  return generateNavEl(anchor, text);
};


// Find the first heading level (`<h1>`, then `<h2>`, etc.) that has more than one element. Defaults to 1 (for `<h1>`).
const getTopLevel = ($scope) => {
  for (let i = 1; i <= 6; i++) {
    const $headings = findOrFilter($scope, 'h' + i);
    if ($headings.length > 1) {
      return i;
    }
  }
  return 1;
};


// returns the elements for the top level, and the next below it
const getHeadings =  ($scope, topLevel) => {
  const topSelector = 'h' + topLevel;

  const secondaryLevel = topLevel + 1;
  const secondarySelector = 'h' + secondaryLevel;

  return findOrFilter($scope, topSelector + ',' + secondarySelector);
};

const getNavLevel = (el) => {
  return parseInt(el.tagName.charAt(1), 10);
};

const populateNav = ($topContext, topLevel, $headings) => {
  let $context = $topContext;
  let $prevNav;

  $headings.each(function (i, el) {
    const $newNav = generateNavItem(el);
    const navLevel = getNavLevel(el);

    // determine the proper $context
    if (navLevel === topLevel) {
      // use top level
      $context = $topContext;
    } else if ($prevNav && $context === $topContext) {
      // create a new level of the tree and switch to it
      $context = createChildNavList($prevNav);
    } // else use the current $context

    $context.append($newNav);

    $prevNav = $newNav;
  });
};

const parseOps = (arg) => {
  const opts = arg.jquery ?
    {$nav: arg} :
    arg;

  opts.$scope = opts.$scope || $(document.body);
  return opts;
};

export const initToc = (opts) => {
  opts = parseOps(opts);

  // ensure that the data attribute is in place for styling
  opts.$nav.attr('data-toggle', 'toc');

  const $topContext = createChildNavList(opts.$nav);
  const topLevel = getTopLevel(opts.$scope);
  const $headings = getHeadings(opts.$scope, topLevel);
  populateNav($topContext, topLevel, $headings);
};