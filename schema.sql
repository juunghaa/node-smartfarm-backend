--
-- PostgreSQL database dump
--

\restrict fhWhv4V8XVxzM8igTyPq7o0qPQrJHt2ob6XdoMvhdsopRmdHxpbTVd6StjlyhSm

-- Dumped from database version 17.4
-- Dumped by pg_dump version 17.9 (Homebrew)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: actuator_logs; Type: TABLE; Schema: public; Owner: jun8ha
--

CREATE TABLE public.actuator_logs (
    id bigint NOT NULL,
    greenhouse_id text NOT NULL,
    actuator text NOT NULL,
    action text NOT NULL,
    duration_ms integer,
    ts timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.actuator_logs OWNER TO jun8ha;

--
-- Name: actuator_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: jun8ha
--

CREATE SEQUENCE public.actuator_logs_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.actuator_logs_id_seq OWNER TO jun8ha;

--
-- Name: actuator_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: jun8ha
--

ALTER SEQUENCE public.actuator_logs_id_seq OWNED BY public.actuator_logs.id;


--
-- Name: alert_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.alert_logs (
    id integer NOT NULL,
    greenhouse_id character varying(50) DEFAULT 'gh1'::character varying NOT NULL,
    alert_type character varying(50) NOT NULL,
    message text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.alert_logs OWNER TO postgres;

--
-- Name: alert_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.alert_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.alert_logs_id_seq OWNER TO postgres;

--
-- Name: alert_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.alert_logs_id_seq OWNED BY public.alert_logs.id;


--
-- Name: daily_reports; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.daily_reports (
    id integer NOT NULL,
    greenhouse_id character varying(50) NOT NULL,
    report_date date NOT NULL,
    avg_temp numeric,
    avg_humidity numeric,
    avg_soil numeric,
    avg_lux numeric,
    data_count integer DEFAULT 0 NOT NULL,
    alert_count integer DEFAULT 0,
    alert_types jsonb DEFAULT '{}'::jsonb NOT NULL,
    risk_level character varying(20) DEFAULT 'low'::character varying NOT NULL,
    report_text text,
    recommendations jsonb DEFAULT '[]'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.daily_reports OWNER TO postgres;

--
-- Name: daily_reports_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.daily_reports_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.daily_reports_id_seq OWNER TO postgres;

--
-- Name: daily_reports_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.daily_reports_id_seq OWNED BY public.daily_reports.id;


--
-- Name: greenhouses; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.greenhouses (
    id integer NOT NULL,
    greenhouse_id character varying(50) NOT NULL,
    plant_type character varying(50) DEFAULT 'sansevieria'::character varying NOT NULL,
    location_type character varying(20) DEFAULT 'indoor'::character varying NOT NULL,
    use_sensor boolean DEFAULT true NOT NULL,
    lat numeric,
    lon numeric,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.greenhouses OWNER TO postgres;

--
-- Name: greenhouses_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.greenhouses_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.greenhouses_id_seq OWNER TO postgres;

--
-- Name: greenhouses_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.greenhouses_id_seq OWNED BY public.greenhouses.id;


--
-- Name: plants; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.plants (
    id integer NOT NULL,
    plant_key character varying(50) NOT NULL,
    name_ko character varying(100) NOT NULL,
    location_type character varying(20) NOT NULL,
    difficulty character varying(20) NOT NULL,
    bug_resistant boolean DEFAULT false NOT NULL,
    light_level character varying(20) NOT NULL,
    water_freq character varying(20) NOT NULL,
    description text,
    image_url text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.plants OWNER TO postgres;

--
-- Name: plants_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.plants_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.plants_id_seq OWNER TO postgres;

--
-- Name: plants_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.plants_id_seq OWNED BY public.plants.id;


--
-- Name: sensor_readings; Type: TABLE; Schema: public; Owner: jun8ha
--

CREATE TABLE public.sensor_readings (
    id bigint NOT NULL,
    greenhouse_id text NOT NULL,
    temperature numeric,
    humidity numeric,
    soil_moisture numeric,
    ts timestamp with time zone NOT NULL,
    lux numeric
);


ALTER TABLE public.sensor_readings OWNER TO jun8ha;

--
-- Name: sensor_readings_id_seq; Type: SEQUENCE; Schema: public; Owner: jun8ha
--

CREATE SEQUENCE public.sensor_readings_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.sensor_readings_id_seq OWNER TO jun8ha;

--
-- Name: sensor_readings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: jun8ha
--

ALTER SEQUENCE public.sensor_readings_id_seq OWNED BY public.sensor_readings.id;


--
-- Name: user_plants; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_plants (
    id integer NOT NULL,
    greenhouse_id character varying(50) NOT NULL,
    plant_key character varying(50) NOT NULL,
    nickname character varying(100),
    registered_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.user_plants OWNER TO postgres;

--
-- Name: user_plants_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.user_plants_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.user_plants_id_seq OWNER TO postgres;

--
-- Name: user_plants_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.user_plants_id_seq OWNED BY public.user_plants.id;


--
-- Name: weather_logs; Type: TABLE; Schema: public; Owner: jun8ha
--

CREATE TABLE public.weather_logs (
    id integer NOT NULL,
    greenhouse_id character varying(50) DEFAULT 'gh1'::character varying NOT NULL,
    outdoor_temp numeric,
    rain_prob numeric,
    fetched_at timestamp with time zone DEFAULT now() NOT NULL,
    location_type character varying(50),
    outdoor_humidity numeric,
    weather_desc character varying(100)
);


ALTER TABLE public.weather_logs OWNER TO jun8ha;

--
-- Name: weather_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: jun8ha
--

CREATE SEQUENCE public.weather_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.weather_logs_id_seq OWNER TO jun8ha;

--
-- Name: weather_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: jun8ha
--

ALTER SEQUENCE public.weather_logs_id_seq OWNED BY public.weather_logs.id;


--
-- Name: actuator_logs id; Type: DEFAULT; Schema: public; Owner: jun8ha
--

ALTER TABLE ONLY public.actuator_logs ALTER COLUMN id SET DEFAULT nextval('public.actuator_logs_id_seq'::regclass);


--
-- Name: alert_logs id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.alert_logs ALTER COLUMN id SET DEFAULT nextval('public.alert_logs_id_seq'::regclass);


--
-- Name: daily_reports id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.daily_reports ALTER COLUMN id SET DEFAULT nextval('public.daily_reports_id_seq'::regclass);


--
-- Name: greenhouses id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.greenhouses ALTER COLUMN id SET DEFAULT nextval('public.greenhouses_id_seq'::regclass);


--
-- Name: plants id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.plants ALTER COLUMN id SET DEFAULT nextval('public.plants_id_seq'::regclass);


--
-- Name: sensor_readings id; Type: DEFAULT; Schema: public; Owner: jun8ha
--

ALTER TABLE ONLY public.sensor_readings ALTER COLUMN id SET DEFAULT nextval('public.sensor_readings_id_seq'::regclass);


--
-- Name: user_plants id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_plants ALTER COLUMN id SET DEFAULT nextval('public.user_plants_id_seq'::regclass);


--
-- Name: weather_logs id; Type: DEFAULT; Schema: public; Owner: jun8ha
--

ALTER TABLE ONLY public.weather_logs ALTER COLUMN id SET DEFAULT nextval('public.weather_logs_id_seq'::regclass);


--
-- Name: actuator_logs actuator_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: jun8ha
--

ALTER TABLE ONLY public.actuator_logs
    ADD CONSTRAINT actuator_logs_pkey PRIMARY KEY (id);


--
-- Name: alert_logs alert_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.alert_logs
    ADD CONSTRAINT alert_logs_pkey PRIMARY KEY (id);


--
-- Name: daily_reports daily_reports_greenhouse_id_report_date_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.daily_reports
    ADD CONSTRAINT daily_reports_greenhouse_id_report_date_key UNIQUE (greenhouse_id, report_date);


--
-- Name: daily_reports daily_reports_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.daily_reports
    ADD CONSTRAINT daily_reports_pkey PRIMARY KEY (id);


--
-- Name: greenhouses greenhouses_greenhouse_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.greenhouses
    ADD CONSTRAINT greenhouses_greenhouse_id_key UNIQUE (greenhouse_id);


--
-- Name: greenhouses greenhouses_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.greenhouses
    ADD CONSTRAINT greenhouses_pkey PRIMARY KEY (id);


--
-- Name: plants plants_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.plants
    ADD CONSTRAINT plants_pkey PRIMARY KEY (id);


--
-- Name: plants plants_plant_key_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.plants
    ADD CONSTRAINT plants_plant_key_key UNIQUE (plant_key);


--
-- Name: sensor_readings sensor_readings_pkey; Type: CONSTRAINT; Schema: public; Owner: jun8ha
--

ALTER TABLE ONLY public.sensor_readings
    ADD CONSTRAINT sensor_readings_pkey PRIMARY KEY (id);


--
-- Name: user_plants user_plants_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_plants
    ADD CONSTRAINT user_plants_pkey PRIMARY KEY (id);


--
-- Name: user_plants user_plants_greenhouse_id_plant_key_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_plants
    ADD CONSTRAINT user_plants_greenhouse_id_plant_key_key UNIQUE (greenhouse_id, plant_key);


--
-- Name: weather_logs weather_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: jun8ha
--

ALTER TABLE ONLY public.weather_logs
    ADD CONSTRAINT weather_logs_pkey PRIMARY KEY (id);


--
-- Name: idx_actuator_logs_gh_ts; Type: INDEX; Schema: public; Owner: jun8ha
--

CREATE INDEX idx_actuator_logs_gh_ts ON public.actuator_logs USING btree (greenhouse_id, ts DESC);


--
-- Name: idx_sensor_readings_gh_ts; Type: INDEX; Schema: public; Owner: jun8ha
--

CREATE INDEX idx_sensor_readings_gh_ts ON public.sensor_readings USING btree (greenhouse_id, ts DESC);


--
-- Name: user_plants user_plants_plant_key_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_plants
    ADD CONSTRAINT user_plants_plant_key_fkey FOREIGN KEY (plant_key) REFERENCES public.plants(plant_key);

--
-- Name: user_plants user_plants_greenhouse_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_plants
    ADD CONSTRAINT user_plants_greenhouse_id_fkey FOREIGN KEY (greenhouse_id) REFERENCES public.greenhouses(greenhouse_id);


--
-- Name: TABLE alert_logs; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.alert_logs TO jun8ha;


--
-- Name: SEQUENCE alert_logs_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.alert_logs_id_seq TO jun8ha;


--
-- Name: TABLE daily_reports; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.daily_reports TO jun8ha;


--
-- Name: SEQUENCE daily_reports_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,USAGE ON SEQUENCE public.daily_reports_id_seq TO jun8ha;


--
-- Name: TABLE greenhouses; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.greenhouses TO jun8ha;


--
-- Name: SEQUENCE greenhouses_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.greenhouses_id_seq TO jun8ha;


--
-- Name: TABLE plants; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.plants TO jun8ha;


--
-- Name: SEQUENCE plants_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.plants_id_seq TO jun8ha;


--
-- Name: TABLE user_plants; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.user_plants TO jun8ha;


--
-- Name: SEQUENCE user_plants_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,USAGE ON SEQUENCE public.user_plants_id_seq TO jun8ha;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO jun8ha;


--
-- PostgreSQL database dump complete
--

\unrestrict fhWhv4V8XVxzM8igTyPq7o0qPQrJHt2ob6XdoMvhdsopRmdHxpbTVd6StjlyhSm
