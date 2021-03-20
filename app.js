const BASE_URL = "https://api.harvardartmuseums.org";
const KEY = "apikey=89ce130f-5c07-4fce-ae18-26be55ee9c8d"; // USE YOUR KEY HERE

async function fetchAllCenturies() {
  if (localStorage.getItem("centuries")) {
    return JSON.parse(localStorage.getItem("centuries"));
  }

  const url = `${BASE_URL}/century?${KEY}&size=100&sort=temporalorder`;

  try {
    const response = await fetch(url);
    const { records } = await response.json();

    localStorage.setItem("centuries", JSON.stringify(records));
    return records;
  } catch (error) {
    console.error(error);
  }
}

async function fetchAllClassifications() {
  if (localStorage.getItem("classifications")) {
    return JSON.parse(localStorage.getItem("classifications"));
  }

  const url = `${BASE_URL}/classification?${KEY}&size=100&sort=name`;

  try {
    const response = await fetch(url);
    const { records } = await response.json();

    localStorage.setItem("classifications", JSON.stringify(records));
    return records;
  } catch (error) {
    console.error(error);
  }
}

async function prefetchCategoryLists() {
  try {
    const [classifications, centuries] = await Promise.all([
      fetchAllClassifications(),
      fetchAllCenturies(),
    ]);

    // This provides a clue to the user, that there are items in the dropdown
    $(".classification-count").text(`(${classifications.length})`);

    classifications.forEach(({ name }) => {
      $("#select-classification").append(
        `<option value="${name}">${name}</option>`
      );
    });

    // This provides a clue to the user, that there are items in the dropdown
    $(".century-count").text(`(${centuries.length}))`);

    centuries.forEach(({ name }) => {
      $("#select-century").append(`<option value="${name}">${name}</option>`);
    });
  } catch (error) {
    console.error(error);
  } finally {
    onFetchEnd();
  }
}

async function fetchObjects() {
  const url = `${BASE_URL}/object?${KEY}`;
  onFetchStart();

  try {
    const response = await fetch(url);
    const data = await response.json();

    return data;
  } catch (error) {
    console.error(error);
  } finally {
    onFetchEnd();
  }
}

function buildSearchString() {
  const [classification, century, keyword] = [
    $("#select-classification").val(),
    $("#select-century").val(),
    $("#keywords").val(),
  ];

  return encodeURI(
    `${BASE_URL}/object?${KEY}&classification=${classification}&century=${century}&keyword=${keyword}`
  );
}

prefetchCategoryLists();

$("#search").on("submit", async function (event) {
  // prevent the default
  event.preventDefault();
  onFetchStart();
  try {
    // get the url from `buildSearchString`
    const submitURL = buildSearchString();
    // fetch it with await, store the result
    const result = await fetch(submitURL);
    const data = await result.json();
    updatePreview(data);
  } catch (error) {
    console.error(error);
  } finally {
    onFetchEnd();
  }
});

//code to toggle the model
function onFetchStart() {
  $("#loading").addClass("active");
}

function onFetchEnd() {
  $("#loading").removeClass("active");
}

function renderPreview(record) {
  //What can you do if description is undifined?
  let description = record.description || "";
  let baseimageurl = record.images ? record.images[0].baseimageurl : '';

  const {title} = record;

  let div = $(`
  <div class="object-preview">
    <a href="#">
      ${baseimageurl ? `<img src="${baseimageurl}" />`: ''}
      <h3>${title}</h3>
      <br>
      ${description ? `<h3>${description}</h3>` : ""}
    </a>
  </div>
  `);

  div.data("record", record);

  return div;

  //Some of the items might be undefined, if so... don't render them

  //With the record attached as data, with key 'record'

  // return new element
}

function updatePreview({ info, records }) {
  const root = $("#preview");
  //enable / disable the next previous buttons
  if (info.next) {
    root.find(".next").data("url", info.next).attr("disabled", false);
  } else {
    root.find(".next").data("url", "null").attr("disabled", true);
  }

  if (info.prev) {
    root.find(".previous").data("url", info.prev).attr("disabled", false);
  } else {
    root.find(".previous").data("url", "null").attr("disabled", true);
  }

  // grab the results element, it matches .results inside root
  root.find(".results").empty();
  // loop over the records, and append the renderPreview
  records.forEach((record) => {
    console.log("record", record);
    root.find(".results").append(renderPreview(record));
  });
}

$("#preview .next, #preview .previous").on("click", async function () {
  //read off url from the target
  const buttonURL = $(this).data("url");
  //fetch the url
  onFetchStart();
  try {
    const result = await fetch(buttonURL);
    const data = await result.json();
    updatePreview(data);
  } catch (error) {
    console.error(error);
  } finally {
    onFetchEnd();
  }
  //read the records and info from the response.json()
  //update the preview
});

$("#preview").on("click", ".object-preview", function (event) {
  event.preventDefault(); // they're anchor tags, so don't follow the link
  // find the '.object-preview' element by using .closest() from the target
  const previewObj = $(this).data("record");
  // recover the record from the element using the .data('record') we attached
  // log out the record object to see the shape of the data
  console.log("previewObj", previewObj);
});

function renderFeature(record) {
  /**
   * We need to read, from record, the following:
   * HEADER: title, dated
   * FACTS: description, culture, style, technique, medium, dimensions, people, department, division, contact, creditline
   * PHOTOS: images, primaryimageurl
   */

  // build and return template
  const {
    title,
    dated,
    description,
    culture,
    style,
    technique,
    medium,
    dimensions,
    department,
    division,
    contact,
    creditline,
    images: [{ baseimageurl }],
  } = record;

  return $(`
    <div class="object-feature">
      <header>
        <h3>${title}</h3>
        <h4>${dated}</h4>
      </header>
      <section class="facts">
        ${factHTML("Description", record.description)}
        ${factHTML("culture", record.culture)}
        ${factHTML("Style", record.style)}
        ${factHTML("Technique", record.style)}
        ${factHTML("Style", record.style)}
        ${factHTML("Style", record.style)}
        ${factHTML("Style", record.style)}
        ${factHTML("Style", record.style)}
        ${factHTML("Culture", record.culture, "culture")}
      </section>
      <section class="photos">
        <img src="${baseimageurl}" />
      </section>
    </div>
  `);
}

function searchURL(searchType, searchString) {
  return `${BASE_URL}/object?${KEY}&${searchType}=${searchString}`;
}

function factHTML(title, content, searchTerm = null) {
  // if content is empty or undefined, return an empty string ''
  if (!content) {
    return "";
  } else if (!searchTerm) {
    return `<span class="title">${title}</span>
    <span class="content">${content}</span>`;
  } else {
    return `<span class="title">${title}</span>
    <span class="content"><a href="${searchURL(
      content,
      searchTerm
    )}">${content}</a></span>`;
  }
}
