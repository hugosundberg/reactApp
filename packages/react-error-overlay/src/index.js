/**
 * Copyright (c) 2015-present, Facebook, Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

/* @flow */
import { listenToRuntimeErrors } from './listenToRuntimeErrors';
import { iframeStyle } from './styles';
import { applyStyles } from './utils/dom/css';

/* eslint-disable import/no-webpack-loader-syntax */
//$FlowFixMe
import iframeScript from 'raw-loader!iframeScript';
/* eslint-enable import/no-webpack-loader-syntax */

import type { ErrorRecord } from './listenToRuntimeErrors';

type RuntimeReportingOptions = {|
  onError: () => void,
  launchEditorEndpoint: string,
  filename?: string,
|};

let iframe: null | HTMLIFrameElement = null;
let isLoadingIframe: boolean = false;
var isIframeReady: boolean = false;

let currentBuildError: null | string = null;
let currentRuntimeErrorRecords: Array<ErrorRecord> = [];
let currentRuntimeErrorOptions: null | RuntimeReportingOptions = null;
let stopListeningToRuntimeErrors: null | (() => void) = null;

export function reportBuildError(error: string) {
  currentBuildError = error;
  update();
}

export function dismissBuildError() {
  currentBuildError = null;
  update();
}

export function startReportingRuntimeErrors(options: RuntimeReportingOptions) {
  if (stopListeningToRuntimeErrors !== null) {
    throw new Error('Already listening');
  }
  currentRuntimeErrorOptions = options;
  listenToRuntimeErrors(errorRecord => {
    try {
      if (typeof options.onError === 'function') {
        options.onError.call(null);
      }
    } finally {
      handleRuntimeError(errorRecord);
    }
  }, options.filename);
}

function handleRuntimeError(errorRecord) {
  if (
    currentRuntimeErrorRecords.some(({ error }) => error === errorRecord.error)
  ) {
    // Deduplicate identical errors.
    // This fixes https://github.com/facebookincubator/create-react-app/issues/3011.
    return;
  }
  currentRuntimeErrorRecords = currentRuntimeErrorRecords.concat([errorRecord]);
  update();
}

function dismissRuntimeErrors() {
  currentRuntimeErrorRecords = [];
  update();
}

export function stopReportingRuntimeErrors() {
  if (stopListeningToRuntimeErrors === null) {
    throw new Error('Not currently listening');
  }
  currentRuntimeErrorOptions = null;
  try {
    stopListeningToRuntimeErrors();
  } finally {
    stopListeningToRuntimeErrors = null;
  }
}

function update() {
  // Loading iframe can be either sync or async depending on the browser.
  if (isLoadingIframe) {
    // Iframe is loading.
    // First render will happen soon--don't need to do anything.
    return;
  }
  if (isIframeReady) {
    // Iframe is ready.
    // Just update it.
    updateIframeContent();
    return;
  }
  // We need to schedule the first render.
  isLoadingIframe = true;
  const loadingIframe = window.document.createElement('iframe');
  applyStyles(loadingIframe, iframeStyle);
  loadingIframe.onload = function() {
    const iframeDocument = loadingIframe.contentDocument;
    if (iframeDocument != null && iframeDocument.body != null) {
      iframe = loadingIframe;
      const script = loadingIframe.contentWindow.document.createElement(
        'script'
      );
      script.type = 'text/javascript';
      script.innerHTML = iframeScript;
      iframeDocument.body.appendChild(script);
    }
  };
  const appDocument = window.document;
  appDocument.body.appendChild(loadingIframe);
}

function updateIframeContent() {
  if (!currentRuntimeErrorOptions) {
    throw new Error('Expected options to be injected.');
  }

  if (!iframe) {
    throw new Error('Iframe has not been created yet.');
  }

  const isRendered = iframe.contentWindow.updateContent({
    currentBuildError,
    currentRuntimeErrorRecords,
    dismissRuntimeErrors,
    launchEditorEndpoint: currentRuntimeErrorOptions.launchEditorEndpoint,
  });

  if (!isRendered) {
    window.document.body.removeChild(iframe);
    iframe = null;
    isIframeReady = false;
  }
}

window.__REACT_ERROR_OVERLAY_GLOBAL_HOOK__ =
  window.__REACT_ERROR_OVERLAY_GLOBAL_HOOK__ || {};
window.__REACT_ERROR_OVERLAY_GLOBAL_HOOK__.iframeReady = function iframeReady() {
  isIframeReady = true;
  isLoadingIframe = false;
  updateIframeContent();
};
