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
  let div = $(`
  <div class="object-preview">
    <a href="#">
      ${record.primaryimageurl ? `<img src="${record.primaryimageurl}" />` : ""}
      <h3>${record.title}</h3>
      <br>
      ${record.description ? `<h3>${record.description}</h3>` : ""}
    </a>
  </div>
  `);

  div.data("record", record);

  return div;
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
  const record = $(this).data("record");
  // recover the record from the element using the .data('record') we attached
  // log out the record object to see the shape of the data
  // NEW => set the html() on the '#feature' element to renderFeature()
  $("#feature").html(renderFeature(record));
});

function renderFeature(record) {
  const { title, dated } = record;

  return $(`
    <div class="object-feature">
      <header>
        <h3>${title}</h3>
        <h4>${dated}</h4>
      </header>
      <section class="facts">
        ${factHTML("Description", record.description)}
        ${factHTML("Culture", record.culture, record.culture)}
        ${factHTML("Style", record.style)}
        ${factHTML("Technique", record.technique, record.technique)}
        ${factHTML("Medium", record.medium, record.medium)}
        ${
          record.people
            ? record.people
                .map((person) =>
                  factHTML("Person", person.displayname, "person")
                )
                .join("")
            : ""
        }
        ${factHTML("Dimensions", record.dimensions)}
        ${factHTML("Department", record.department)}
        ${factHTML("Division", record.division)}
        ${factHTML(
          "Contact",
          `<a target="_blank" href="mailto:${record.contact}">${record.contact}</a>`
        )}
        ${factHTML("Creditline", record.creditline)}
      </section>
      <section class="photos">
        ${photosHTML(record.images, record.primaryimageurl)}
      </section>
    </div>
  `);
}

function searchURL(searchType, searchString) {
  return encodeURI(
    `${BASE_URL}/object?${KEY}&${searchType.toLowerCase()}=${searchString}`
  );
}

function factHTML(title, content, searchTerm = null) {
  if (!content) {
    return "";
  } else if (!searchTerm) {
    return `<span class="title">${title}</span>
    <span class="content">${content}</span>`;
  } else {
    return `<span class="title">${title}</span>
    <span class="content"><a href="${searchURL(
      title,
      searchTerm
    )}">${content}</a></span>`;
  }
}

function photosHTML(images, primaryimageurl) {
  if (images && images.length > 0) {
    return images
      .map((image) => `<img src="${image.baseimageurl}" />`)
      .join("");
  } else if (primaryimageurl) {
    return `<img src="${primaryimageurl}" />`;
  } else {
    return "";
  }
}

$("#feature").on("click", "a", async function (event) {
  const link = $(this).attr("href");
  if (link.startsWith("mailto")) {
    return;
  }
  event.preventDefault();
  onFetchStart();
  try {
    const response = await fetch(link);
    const data = await response.json();
    updatePreview(data);
  } catch (error) {
    console.log(error);
  } finally {
    onFetchEnd();
  }
});
